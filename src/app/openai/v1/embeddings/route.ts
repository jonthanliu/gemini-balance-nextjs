export const runtime = "edge";

import { isAuthenticated } from "@/lib/auth";
import {
  createReadableStream,
  getRequestBody,
  getRequestHeaders,
} from "@/lib/gemini-proxy";
import { getSettings } from "@/lib/settings";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }

  const { PROXY_URL } = await getSettings();

  if (!PROXY_URL) {
    return NextResponse.json(
      {
        error:
          "Upstream proxy URL is not configured. Please set PROXY_URL in the settings.",
      },
      { status: 500 }
    );
  }

  try {
    const headers = getRequestHeaders(request);
    const body = await getRequestBody(request);

    const response = await fetch(`${PROXY_URL}/embeddings`, {
      method: "POST",
      headers,
      body,
    });

    if (response.body) {
      const stream = createReadableStream(response.body);
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } else {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch (error) {
    console.error("Error proxying embeddings request:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to upstream service." },
      { status: 500 }
    );
  }
}
