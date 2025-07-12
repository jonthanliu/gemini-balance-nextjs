import { getKeyManager } from "@/lib/key-manager";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { model: string[] } }
) {
  const keyManager = await getKeyManager();
  const apiKey = keyManager.getNextWorkingKey();

  // Reconstruct the original Gemini API URL
  const modelPath = params.model.join("/");
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}?key=${apiKey}`;

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
    console.error("Error proxying to Gemini:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to Gemini" },
      { status: 500 }
    );
  }
}
