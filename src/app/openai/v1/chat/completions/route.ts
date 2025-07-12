import { callGeminiApi } from "@/lib/gemini-client";
import {
  geminiToOpenAiStreamChunk,
  OpenAIChatRequest,
  openAiToGeminiRequest,
} from "@/lib/google-adapter";
import logger from "@/lib/logger";
import { EnhancedGenerateContentResponse } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * Transforms a stream of Gemini SDK chunks into an OpenAI-compatible SSE stream.
 */
function transformGeminiStreamToOpenAIStream(
  geminiStream: ReadableStream,
  model: string
): ReadableStream {
  const textDecoder = new TextDecoder();
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const decodedChunk = textDecoder.decode(chunk, { stream: true });

      // Process each line in the chunk, as one chunk can have multiple SSE messages
      const lines = decodedChunk.split("\n\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonString = line.substring(6);
            if (jsonString.trim()) {
              const geminiChunk: EnhancedGenerateContentResponse =
                JSON.parse(jsonString);
              const openAIChunk = geminiToOpenAiStreamChunk(geminiChunk, model);
              controller.enqueue(openAIChunk);
            }
          } catch (error) {
            logger.error({ error }, "Error parsing stream chunk");
            // Decide if we should bubble up the error or just skip the chunk
          }
        }
      }
    },
    flush(controller) {
      controller.enqueue("data: [DONE]\n\n");
    },
  });

  return geminiStream.pipeThrough(transformStream);
}

export async function POST(request: NextRequest) {
  const requestBody: OpenAIChatRequest = await request.json();
  const model = requestBody.model || "gemini-pro";

  // 1. Adapt the OpenAI request to the Gemini format
  const geminiRequest = {
    contents: openAiToGeminiRequest(requestBody.messages),
    // TODO: Add other parameters like temperature, topP etc. from requestBody
  };

  // 2. Call the Gemini API using our robust client
  const geminiResponse = await callGeminiApi({
    model,
    request: geminiRequest,
  });

  // 3. If the response is a successful stream, adapt it to the OpenAI format
  if (geminiResponse.ok && geminiResponse.body) {
    const openAIStream = transformGeminiStreamToOpenAIStream(
      geminiResponse.body,
      model
    );
    return new NextResponse(openAIStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // 4. If it's an error response, return it directly
  return geminiResponse;
}
