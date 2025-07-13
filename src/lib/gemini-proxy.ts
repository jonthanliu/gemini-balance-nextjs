import { getKeyManager } from "@/lib/key-manager";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";
import {
  buildGeminiRequest,
  formatGoogleModelsToOpenAI,
} from "./google-adapter";
import logger from "./logger";
import { getSettings } from "./settings";

const GOOGLE_API_HOST =
  process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";

export async function proxyRequest(request: NextRequest, pathPrefix: string) {
  const startTime = Date.now();
  let apiKey = "unknown";
  let model = "unknown";
  let statusCode: number | null = null;
  let isSuccess = false;

  try {
    const keyManager = await getKeyManager();
    apiKey = keyManager.getNextWorkingKey();

    // Reconstruct the original Gemini API URL
    const url = new URL(request.url);
    const modelPath = url.pathname.replace(pathPrefix, "");
    model = modelPath.split("/").pop()?.split(":")[0] ?? ""; // Assign to the outer model variable
    const geminiUrl = `${GOOGLE_API_HOST}${modelPath}${
      url.search ? url.search + "&" : "?"
    }key=${apiKey}`;

    const requestBody = await request.json();
    const geminiRequestBody = await buildGeminiRequest(model, requestBody);
    const settings = await getSettings();

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequestBody),
      // @ts-ignore
      duplex: "half",
    };

    if (settings.PROXY_URL) {
      (fetchOptions as any).agent = new HttpsProxyAgent(settings.PROXY_URL);
    }

    const geminiResponse = await fetch(geminiUrl, fetchOptions);

    // If the response is streaming, we pipe it through.
    if (
      geminiResponse.headers.get("Content-Type")?.includes("text/event-stream")
    ) {
      return new NextResponse(geminiResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        status: geminiResponse.status,
      });
    }

    // Otherwise, we return the JSON response directly.
    // Check if the response from Gemini is not OK
    if (!geminiResponse.ok) {
      statusCode = geminiResponse.status;
      keyManager.handleApiFailure(apiKey);
      const errorBody = await geminiResponse.json();
      const errorMessage = errorBody.error?.message || "Unknown error";

      await prisma.errorLog.create({
        data: {
          apiKey: apiKey,
          errorType: "gemini_api_error",
          errorMessage: errorMessage,
          errorDetails: JSON.stringify(errorBody),
        },
      });

      logger.error(
        {
          status: geminiResponse.status,
          statusText: geminiResponse.statusText,
          errorBody,
        },
        "Error response from Google Gemini API"
      );
      return NextResponse.json(errorBody, { status: geminiResponse.status });
    }

    // Success
    isSuccess = true;
    statusCode = geminiResponse.status;

    // Otherwise, we return the JSON response directly.
    const data = await geminiResponse.json();

    // If the request is for OpenAI models, format the response.
    if (url.pathname.startsWith("/openai/v1/models")) {
      const formattedData = formatGoogleModelsToOpenAI(data);
      return NextResponse.json(formattedData, {
        status: geminiResponse.status,
      });
    }

    return NextResponse.json(data, { status: geminiResponse.status });
  } catch (error: any) {
    statusCode = 500;
    if (
      error.message.includes("No API keys available") ||
      error.message.includes("KeyManager must be initialized")
    ) {
      logger.warn(
        { error: error.message },
        "KeyManager initialization failed. No keys were loaded from DB or ENV."
      );
      return NextResponse.json(
        {
          error: {
            message: "Forbidden: No API tokens configured",
            code: 403,
            status: "Forbidden",
          },
        },
        { status: 403 }
      );
    }

    if (error.message.includes("All API keys are currently failing")) {
      logger.error(
        { error: error.message },
        "All available API keys are marked as failing."
      );
      return NextResponse.json(
        {
          error: {
            message: "Forbidden: All API keys are failing",
            code: 403,
            status: "Forbidden",
          },
        },
        { status: 403 }
      );
    }

    logger.error({ error }, "Error proxying to Gemini");
    return NextResponse.json(
      { error: "Failed to proxy request to Gemini" },
      { status: 500 }
    );
  } finally {
    if (statusCode) {
      const latency = Date.now() - startTime;
      await prisma.requestLog.create({
        data: {
          apiKey: apiKey,
          model: model,
          statusCode: statusCode,
          isSuccess: isSuccess,
          latency: latency,
        },
      });
    }
  }
}
