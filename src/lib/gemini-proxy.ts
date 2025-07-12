import { getKeyManager } from "@/lib/key-manager";
import { NextRequest, NextResponse } from "next/server";
import logger from "./logger";

const GOOGLE_API_HOST =
  process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";

export async function proxyRequest(request: NextRequest, pathPrefix: string) {
  const keyManager = await getKeyManager();
  const apiKey = keyManager.getNextWorkingKey();

  // Reconstruct the original Gemini API URL
  const url = new URL(request.url);
  const modelPath = url.pathname.replace(pathPrefix, "");
  const geminiUrl = `${GOOGLE_API_HOST}${modelPath}${
    url.search ? url.search + "&" : "?"
  }key=${apiKey}`;

  try {
    const requestBody = await request.json();

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

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
    const data = await geminiResponse.json();
    return NextResponse.json(data, { status: geminiResponse.status });
  } catch (error: any) {
    logger.error({ error }, "Error proxying to Gemini");
    return NextResponse.json(
      { error: "Failed to proxy request to Gemini" },
      { status: 500 }
    );
  }
}
