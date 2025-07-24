import { isAuthenticated } from "@/lib/auth";
import { proxyRequest } from "@/lib/gemini-proxy";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }
  return proxyRequest(request, "/gemini/");
}
