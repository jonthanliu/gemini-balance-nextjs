import {
  geminiToOpenAiStreamChunk,
  OpenAIChatRequest,
  openAiToGeminiRequest,
} from "@/lib/google-adapter";
import { getKeyManager } from "@/lib/key-manager";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  const keyManager = getKeyManager();
  let lastError: any = null;
  let startTime = Date.now();

  const requestBody: OpenAIChatRequest = await request.json();
  const model = requestBody.model || "gemini-pro";

  try {
    const geminiContents = openAiToGeminiRequest(requestBody.messages);

    for (let i = 0; i < MAX_RETRIES; i++) {
      const apiKey = keyManager.getNextWorkingKey();
      startTime = Date.now(); // Reset start time for each attempt

      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: geminiContents }),
          }
        );

        if (!geminiResponse.ok) {
          lastError = await geminiResponse.json();
          const latency = Date.now() - startTime;

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
          continue;
        }

        const latency = Date.now() - startTime;
        await prisma.requestLog.create({
          data: {
            apiKey: apiKey.slice(-4),
            model,
            statusCode: geminiResponse.status,
            isSuccess: true,
            latency,
          },
        });

        const stream = transformGeminiStreamToOpenAIStream(
          geminiResponse,
          model
        );
        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
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

    throw new Error("All API keys failed or the service is unavailable.");
  } catch (error: any) {
    await prisma.errorLog.create({
      data: {
        errorType: "General Error",
        errorMessage: error.message,
        errorDetails: JSON.stringify(lastError),
      },
    });

    return NextResponse.json(
      {
        error: "Service unavailable",
        details: lastError ? JSON.stringify(lastError) : error.message,
      },
      { status: 503 }
    );
  }
}

/**
 * Cleans a JSON string to handle various encoding and control character issues
 */
function cleanJsonString(jsonString: string): string {
  return (
    jsonString
      // Remove BOM (Byte Order Mark) if present
      .replace(/^\uFEFF/, "")
      // Remove zero-width characters that can cause parsing issues
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Only remove null and other problematic control characters, but preserve newlines/tabs for JSON structure
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      // Remove leading/trailing whitespace
      .trim()
  );
}

/**
 * Attempts to parse JSON with better error handling and validation
 */
function safeJsonParse(jsonString: string): any | null {
  try {
    const cleaned = cleanJsonString(jsonString);

    // Validate that we have proper JSON (object or array)
    const trimmed = cleaned.trim();
    const isValidJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"));

    if (!isValidJson) {
      console.warn("Invalid JSON boundaries:", trimmed.slice(0, 50) + "...");
      return null;
    }

    return JSON.parse(trimmed);
  } catch (error) {
    console.error(
      "Error parsing JSON object:",
      jsonString.slice(0, 200) + (jsonString.length > 200 ? "..." : ""),
      error
    );

    // Enhanced debugging when needed
    const cleaned = cleanJsonString(jsonString);
    console.error(
      "Cleaned JSON string:",
      cleaned.slice(0, 100) + (cleaned.length > 100 ? "..." : "")
    );

    return null;
  }
}

/**
 * Processes buffer content to extract and parse complete JSON structures
 */
function processBufferContent(
  buffer: string,
  controller: any,
  model: string
): string {
  let remainingBuffer = buffer;
  let startIndex = 0;

  while (startIndex < remainingBuffer.length) {
    // Find the start of a JSON structure
    const jsonStart = remainingBuffer.indexOf("{", startIndex);
    const arrayStart = remainingBuffer.indexOf("[", startIndex);

    let structureStart = -1;
    let isArray = false;

    if (jsonStart !== -1 && arrayStart !== -1) {
      structureStart = Math.min(jsonStart, arrayStart);
      isArray = arrayStart < jsonStart;
    } else if (jsonStart !== -1) {
      structureStart = jsonStart;
      isArray = false;
    } else if (arrayStart !== -1) {
      structureStart = arrayStart;
      isArray = true;
    } else {
      // No more JSON structures found
      break;
    }

    // Find the matching closing bracket/brace
    let depth = 0;
    let structureEnd = -1;
    const openChar = isArray ? "[" : "{";
    const closeChar = isArray ? "]" : "}";

    for (let i = structureStart; i < remainingBuffer.length; i++) {
      const char = remainingBuffer[i];
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          structureEnd = i;
          break;
        }
      }
    }

    if (structureEnd === -1) {
      // Incomplete JSON structure, keep it in buffer
      return remainingBuffer.slice(structureStart);
    }

    // Extract and parse the complete JSON structure
    const jsonString = remainingBuffer.slice(structureStart, structureEnd + 1);
    const geminiChunk = safeJsonParse(jsonString);

    if (geminiChunk) {
      // Handle both single objects and arrays
      const chunks = Array.isArray(geminiChunk) ? geminiChunk : [geminiChunk];
      for (const chunk of chunks) {
        if (chunk?.candidates) {
          const openAIChunk = geminiToOpenAiStreamChunk(chunk, model);
          controller.enqueue(openAIChunk);
        }
      }
    }

    // Move past this structure
    startIndex = structureEnd + 1;
  }

  // Return any remaining incomplete data
  return remainingBuffer.slice(startIndex);
}

/**
 * Transforms a Gemini API response stream into an OpenAI-compatible SSE stream.
 */
function transformGeminiStreamToOpenAIStream(
  geminiResponse: Response,
  model: string
): ReadableStream {
  const reader = geminiResponse.body!.getReader();
  const textDecoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              processBufferContent(buffer, controller, model);
            }
            controller.enqueue("data: [DONE]\n\n");
            break;
          }

          // Decode the new chunk and add it to our buffer
          const chunkText = textDecoder.decode(value, { stream: true });
          buffer += chunkText;

          // Process complete JSON structures in the buffer
          buffer = processBufferContent(buffer, controller, model);
        }
      } catch (error) {
        console.error("Error while reading or parsing stream:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}
