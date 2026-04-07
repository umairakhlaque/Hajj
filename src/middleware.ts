// ============================================
// AskVault — Next.js Middleware
// Clerk auth + route protection
// ============================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/t/(.*)/chat",
  "/api/chat(.*)",
  "/api/auth/session(.*)",
  "/api/feedback(.*)",
  "/api/webhooks(.*)",
  "/api/google/callback(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Admin routes require Clerk authentication
  if (isAdminRoute(request)) {
    await auth.protect();
  }

  // Security headers for all responses
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
