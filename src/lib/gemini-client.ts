import { prisma } from "@/lib/db";
import { getKeyManager } from "@/lib/key-manager";
import {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { NextResponse } from "next/server";

const MAX_RETRIES = 3;

export interface GeminiClientRequest {
  model: string;
  request: GenerateContentRequest;
}

/**
 * Transforms a stream from the @google/generative-ai SDK into a web-standard ReadableStream.
 */
function sdkStreamToReadableStream(
  sdkStream: AsyncGenerator<EnhancedGenerateContentResponse>
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of sdkStream) {
        // The SDK provides response chunks directly. We adapt them to SSE format.
        const jsonChunk = JSON.stringify(chunk);
        controller.enqueue(encoder.encode(`data: ${jsonChunk}\n\n`));
      }
      controller.close();
    },
  });
}

/**
 * Checks if the given error is an object with an httpStatus property.
 */
function isApiError(error: unknown): error is { httpStatus?: number } {
  return typeof error === "object" && error !== null && "httpStatus" in error;
}

/**
 * Calls the Gemini API using the official SDK with built-in retry logic,
 * key management, and logging.
 *
 * @returns A Response object with the Gemini API's stream or an error.
 */
export async function callGeminiApi({
  model,
  request,
}: GeminiClientRequest): Promise<Response> {
  const keyManager = await getKeyManager();
  let lastError: unknown = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const apiKey = keyManager.getNextWorkingKey();
    const startTime = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const generativeModel = genAI.getGenerativeModel({ model });

      const result = await generativeModel.generateContentStream(request);
      const stream = sdkStreamToReadableStream(result.stream);

      const latency = Date.now() - startTime;
      await prisma.requestLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          model,
          statusCode: 200, // Success
          isSuccess: true,
          latency,
        },
      });
      keyManager.resetKeyFailureCount(apiKey);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      lastError = error;
      const latency = Date.now() - startTime;
      let statusCode = 500;
      let errorMessage = "An unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check for Google API specific error properties
      if (isApiError(error) && error.httpStatus) {
        statusCode = error.httpStatus;
      }

      await prisma.requestLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          model,
          statusCode,
          isSuccess: false,
          latency,
        },
      });
      await prisma.errorLog.create({
        data: {
          apiKey: apiKey.slice(-4),
          errorType: `SDK Error (Attempt ${i + 1})`,
          errorMessage,
          errorDetails: JSON.stringify(error),
        },
      });

      if (statusCode >= 400 && statusCode < 500) {
        keyManager.handleApiFailure(apiKey);
      }
    }
  }

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
