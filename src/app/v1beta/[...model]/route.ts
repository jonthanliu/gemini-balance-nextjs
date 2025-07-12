import { proxyRequest } from "@/lib/gemini-proxy";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // This will proxy requests from /v1beta/... to the Google API's /v1beta/...
  return proxyRequest(request, "");
}
