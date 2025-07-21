export const runtime = "edge";

import { callGeminiApi } from "@/lib/gemini-client";
import {
  OpenAIChatMessage,
  OpenAIChatRequest,
  geminiToOpenAiStreamChunk,
} from "@/lib/google-adapter";
import { callImagenApi } from "@/lib/imagen-client";
import logger from "@/lib/logger";
import {
  Content,
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

function adaptOpenAIRequestToGemini(
  body: OpenAIChatRequest
): GenerateContentRequest {
  const contents: Content[] = body.messages.map((msg: OpenAIChatMessage) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const generationConfig: Record<string, unknown> = {};
  if (body.temperature !== undefined)
    generationConfig.temperature = body.temperature;
  if (body.top_p !== undefined) generationConfig.topP = body.top_p;
  if (body.max_tokens !== undefined)
    generationConfig.maxOutputTokens = body.max_tokens;
  if (body.stop) {
    generationConfig.stopSequences =
      typeof body.stop === "string" ? [body.stop] : body.stop;
  }

  return {
    contents,
    generationConfig,
  };
}

function createUsageChunk(usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "gemini-pro", // This could be dynamic
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
    usage,
  };
}

function transformGeminiStreamToOpenAIStream(
  geminiStream: ReadableStream,
  model: string
): ReadableStream {
  const textDecoder = new TextDecoder();
  let promptTokens = 0;
  let completionTokens = 0;

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const decodedChunk = textDecoder.decode(chunk, { stream: true });
      const lines = decodedChunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonString = line.substring(6);
            if (jsonString.trim()) {
              const geminiChunk: EnhancedGenerateContentResponse =
                JSON.parse(jsonString);

              if (geminiChunk.usageMetadata) {
                promptTokens += geminiChunk.usageMetadata.promptTokenCount || 0;
                completionTokens +=
                  geminiChunk.usageMetadata.candidatesTokenCount || 0;
              }

              const openAIChunk = geminiToOpenAiStreamChunk(geminiChunk, model);
              controller.enqueue(`data: ${JSON.stringify(openAIChunk)}\n\n`);
            }
          } catch (error) {
            logger.error({ error }, "Error parsing stream chunk");
            const errorChunk = {
              error: "Error processing stream from upstream API.",
            };
            controller.enqueue(`data: ${JSON.stringify(errorChunk)}\n\n`);
          }
        }
      }
    },
    flush(controller) {
      const usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      };
      const usageChunk = createUsageChunk(usage);
      controller.enqueue(`data: ${JSON.stringify(usageChunk)}\n\n`);
      controller.enqueue("data: [DONE]\n\n");
    },
  });

  return geminiStream.pipeThrough(transformStream);
}

export async function POST(request: NextRequest) {
  // The 'isAuthenticated' function is now called within the middleware,
  // so it's not needed here anymore.

  // We proceed directly to the main logic.

  try {
    const requestBody: OpenAIChatRequest = await request.json();
    const model = requestBody.model || "gemini-pro";

    // Route to image generation if the model indicates it
    if (model.includes("imagen")) {
      const lastMessage = requestBody.messages[requestBody.messages.length - 1];
      const imageResponse = await callImagenApi({
        prompt: lastMessage.content,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });

      // Adapt the response to a chat-like format
      const chatResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Generated image URL: ${imageResponse.data[0].url}`,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
      return NextResponse.json(chatResponse);
    }

    const geminiRequest = adaptOpenAIRequestToGemini(requestBody);

    // The gemini-client handles key management, retries, and logging
    const geminiResponse = await callGeminiApi({
      model,
      request: geminiRequest,
    });

    if (geminiResponse.ok && requestBody.stream && geminiResponse.body) {
      const openAIStream = transformGeminiStreamToOpenAIStream(
        geminiResponse.body,
        model
      );
      return new NextResponse(openAIStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // For non-streamed or error responses, return them as is.
    return geminiResponse;
  } catch (error) {
    logger.error({ error }, "Critical error in OpenAI compatibility layer.");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
