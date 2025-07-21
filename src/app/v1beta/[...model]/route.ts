export const runtime = "edge";

import { isAuthenticated } from "@/lib/auth";
import { proxyRequest } from "@/lib/gemini-proxy";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }
  // This will proxy requests from /v1beta/... to the Google API's /v1beta/...
  return proxyRequest(request, "");
}
