import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "./lib/settings";

// This function handles API token authentication
async function handleApiAuth(request: NextRequest) {
  const { ALLOWED_TOKENS } = await getSettings();
  const allowedTokens = ALLOWED_TOKENS.split(",").filter(Boolean);

  // If no tokens are set, access is denied by default for security.
  if (allowedTokens.length === 0) {
    return new NextResponse("Forbidden: No API tokens configured", {
      status: 403,
    });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized: Missing or invalid bearer token", {
      status: 401,
    });
  }

  const token = authHeader.substring(7); // "Bearer ".length
  if (!allowedTokens.includes(token)) {
    return new NextResponse("Forbidden: Invalid API token", { status: 403 });
  }

  return NextResponse.next();
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

  // Exclude public paths and the auth page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/auth" ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Route to UI authentication for the admin panel
  if (pathname.startsWith("/admin")) {
    return handleUiAuth(request);
  }

  // Route to API authentication for all other matched routes
  return handleApiAuth(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (the root page)
     * - /auth (the auth page)
     * This ensures both /admin and all API routes are covered.
     */
    "/((?!_next/static|_next/image|favicon.ico|auth|$).*)",
  ],
};
