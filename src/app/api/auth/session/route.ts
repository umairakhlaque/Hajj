// ============================================
// AskVault — Tenant Session Init
// POST /api/auth/session — creates anonymous session
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { createAnonymousSession, SESSION_COOKIE } from "@/lib/auth/tenant-session";
import { apiSuccess, apiError, apiValidationError } from "@/lib/utils/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/utils/audit";

const SessionInitSchema = z.object({
  tenantSlug: z.string(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateResult = checkRateLimit(`session:${ip}`, 10, 60_000);
  if (!rateResult.allowed) {
    return apiError("Too many session requests", 429);
  }

  try {
    const body = SessionInitSchema.parse(await request.json());

    const tenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug, isActive: true },
    });

    if (!tenant) return apiError("Tenant not found", 404);

    if (tenant.authMode !== "ANONYMOUS") {
      return apiError("This workspace requires authentication", 403);
    }

    const jwt = await createAnonymousSession(tenant.id);

    const response = NextResponse.json({ success: true, data: { ok: true } });
    response.cookies.set(SESSION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.issues?.[0]?.message ?? "Invalid request");
    }
    return apiError("Failed to create session", 500);
  }
}
