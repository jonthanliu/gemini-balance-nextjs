import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSettings } from "./lib/settings";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/health") {
    return NextResponse.next();
  }

  const { ALLOWED_TOKENS } = await getSettings();
  const allowedTokens = ALLOWED_TOKENS.split(",").filter(Boolean);

  // 如果没有设置允许的令牌，则允许所有请求
  if (allowedTokens.length === 0) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7); // "Bearer ".length
  if (!allowedTokens.includes(token)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/openai/:path*", "/gemini/:path*", "/v1beta/:path*"],
};
