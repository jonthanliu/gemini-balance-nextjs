export const runtime = "edge";

import { isAuthenticated } from "@/lib/auth";
import { callImagenApi } from "@/lib/imagen-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { prompt, n = 1, size = "1024x1024", response_format = "url" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const imageResponse = await callImagenApi({
      prompt,
      n,
      size,
      response_format,
    });

    return NextResponse.json(imageResponse);
  } catch (error) {
    console.error("Error in image generation route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to generate images.", details: errorMessage },
      { status: 500 }
    );
  }
}
