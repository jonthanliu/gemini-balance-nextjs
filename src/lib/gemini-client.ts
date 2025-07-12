import { prisma } from "@/lib/db";
import { getKeyManager } from "@/lib/key-manager";
import { NextResponse } from "next/server";

const MAX_RETRIES = 3;
const GOOGLE_API_HOST =
  process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";

interface GeminiRequestParams {
  model: string;
  body: Record<string, any>;
}

/**
 * Calls the Gemini API with built-in retry logic, key management, and logging.
 *
 * @param model The model name to use (e.g., "gemini-pro").
 * @param body The request body to send to the Gemini API.
 * @returns A NextResponse object with the Gemini API's response.
 * @throws An error if all API key retries fail.
 */
export async function callGeminiApi({
  model,
  body,
}: GeminiRequestParams): Promise<NextResponse> {
  const keyManager = await getKeyManager();
  let lastError: any = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const apiKey = keyManager.getNextWorkingKey();
    const startTime = Date.now();

    try {
      const geminiResponse = await fetch(
        `${GOOGLE_API_HOST}/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const latency = Date.now() - startTime;

      // Handle successful responses
      if (geminiResponse.ok) {
        await prisma.requestLog.create({
          data: {
            apiKey: apiKey.slice(-4),
            model,
            statusCode: geminiResponse.status,
            isSuccess: true,
            latency,
          },
        });
        keyManager.resetKeyFailureCount(apiKey);
        return new NextResponse(geminiResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          status: geminiResponse.status,
        });
      }

      // Handle API errors
      lastError = await geminiResponse.json();
      await prisma.requestLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          model,
          statusCode: geminiResponse.status,
          isSuccess: false,
          latency,
        },
      });
      await prisma.errorLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          errorType: `API Error (Attempt ${i + 1})`,
          errorMessage: lastError?.error?.message || "Unknown API error",
          errorDetails: JSON.stringify(lastError),
        },
      });

      if (geminiResponse.status >= 400 && geminiResponse.status < 500) {
        keyManager.handleApiFailure(apiKey);
      }
      continue; // Retry with the next key
    } catch (error) {
      // Handle fetch/network errors
      lastError = error;
      const latency = Date.now() - startTime;

      await prisma.requestLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          model,
          statusCode: 500, // Generic server error
          isSuccess: false,
          latency,
        },
      });
      await prisma.errorLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          errorType: `Fetch Error (Attempt ${i + 1})`,
          errorMessage: (error as Error).message,
          errorDetails: JSON.stringify(error),
        },
      });

      keyManager.handleApiFailure(apiKey);
    }
  }

  // If all retries fail, throw a final error
  await prisma.errorLog.create({
    data: {
      errorType: "General Error",
      errorMessage: "All API keys failed or the service is unavailable.",
      errorDetails: JSON.stringify(lastError),
    },
  });

  return NextResponse.json(
    {
      error: "Service unavailable",
      details: lastError ? JSON.stringify(lastError) : "Unknown error",
    },
    { status: 503 }
  );
}
