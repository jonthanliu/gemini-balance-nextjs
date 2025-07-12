import { proxyRequest } from "@/lib/gemini-proxy";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/gemini");
}
