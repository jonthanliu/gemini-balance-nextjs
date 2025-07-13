import { NextRequest, NextResponse } from "next/server";
// This function handles API token authentication for the proxy
async function handleProxyAuth(request: NextRequest) {
  const { ALLOWED_TOKENS, AUTH_TOKEN } = process.env;
  const allowedTokens = (ALLOWED_TOKENS || "").split(",").filter(Boolean);
  const validTokens = [...allowedTokens, AUTH_TOKEN].filter(Boolean);

  const key = request.nextUrl.searchParams.get("key");
  const xGoogApiKey = request.headers.get("x-goog-api-key");

  if (key && validTokens.includes(key)) {
    return NextResponse.next();
  }

  if (xGoogApiKey && validTokens.includes(xGoogApiKey)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (validTokens.includes(token)) {
      return NextResponse.next();
    }
  }

  console.warn(
    `Forbidden: Invalid API token provided for path: ${request.nextUrl.pathname}`
  );
  return new NextResponse("Forbidden: Invalid API token", { status: 403 });
}

// This function handles API token authentication for OpenAI routes
async function handleOpenAIAuth(request: NextRequest) {
  const { ALLOWED_TOKENS, AUTH_TOKEN } = process.env;
  const allowedTokens = (ALLOWED_TOKENS || "").split(",").filter(Boolean);
  const validTokens = [...allowedTokens, AUTH_TOKEN].filter(Boolean);

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (validTokens.includes(token)) {
      return NextResponse.next();
    }
  }

  console.warn(
    `Forbidden: Invalid API token provided for path: ${request.nextUrl.pathname}`
  );
  return new NextResponse("Forbidden: Invalid API token", { status: 403 });
}

// This function handles UI authentication via cookies
async function handleUiAuth(request: NextRequest) {
  const { AUTH_TOKEN } = process.env; // UI auth token from environment
  const url = request.nextUrl.clone();

  // If AUTH_TOKEN is not set on the server, the login page will show an error,
  // but we should still allow the user to reach it.
  const tokenFromCookie = request.cookies.get("auth_token")?.value;

  // Redirect to the auth page if the cookie is missing or doesn't match.
  // The login action on the /auth page will handle the case where AUTH_TOKEN is not set.
  if (!tokenFromCookie || tokenFromCookie !== AUTH_TOKEN) {
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`Request received for path: ${pathname}`);

  // Exclude public paths and the auth page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/auth"
  ) {
    return NextResponse.next();
  }

  // Route to UI authentication for the admin panel
  if (pathname.startsWith("/admin") || pathname.startsWith("/test")) {
    return handleUiAuth(request);
  }

  // The root path should not be authenticated as an API endpoint.
  // It's a public page, so we can just let it pass.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // API proxy routes and health checks should not be authenticated here.
  // They are proxied to the backend service which has its own auth.
  if (pathname.startsWith("/gemini") || pathname.startsWith("/v1beta")) {
    return handleProxyAuth(request);
  }

  if (pathname.startsWith("/openai")) {
    return handleOpenAIAuth(request);
  }

  if (pathname.startsWith("/health")) {
    return NextResponse.next();
  }

  // Route to UI authentication for all other matched routes
  return handleUiAuth(request);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/test/:path*",
    "/api/:path*",
    "/gemini/:path*",
    "/openai/:path*",
    "/v1beta/:path*",
    "/health/:path*",
  ],
};
