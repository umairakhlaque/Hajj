// ============================================
// AskVault — Standardized API Response Helpers
// ============================================

import { NextResponse } from "next/server";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export function apiSuccess<T>(data: T, status = 200, message?: string): NextResponse {
  return NextResponse.json({ success: true, data, message } satisfies ApiSuccess<T>, {
    status,
  });
}

export function apiError(
  error: string,
  status = 500,
  code?: string
): NextResponse {
  // Never expose stack traces in production
  const safeError =
    process.env.NODE_ENV === "production" && status === 500
      ? "An internal error occurred"
      : error;

  return NextResponse.json({ success: false, error: safeError, code } satisfies ApiError, {
    status,
  });
}

export function apiUnauthorized(message = "Unauthorized"): NextResponse {
  return apiError(message, 401, "UNAUTHORIZED");
}

export function apiForbidden(message = "Forbidden"): NextResponse {
  return apiError(message, 403, "FORBIDDEN");
}

export function apiNotFound(resource = "Resource"): NextResponse {
  return apiError(`${resource} not found`, 404, "NOT_FOUND");
}

export function apiRateLimited(resetAt: number): NextResponse {
  const response = apiError("Rate limit exceeded. Please slow down.", 429, "RATE_LIMITED");
  response.headers.set("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
  return response;
}

export function apiValidationError(message: string): NextResponse {
  return apiError(message, 422, "VALIDATION_ERROR");
}
