// ============================================
// AskVault — Google OAuth Connect
// GET /api/google/connect?tenantId=xxx
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { generateAuthUrl } from "@/lib/connectors/google-drive/oauth-flow";
import { apiError, apiUnauthorized } from "@/lib/utils/api-response";
import { SignJWT } from "jose";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.ADMIN_SECRET_KEY ?? "");
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) return apiError("tenantId required", 400);

    // Encode state as JWT for CSRF protection
    const state = await new SignJWT({
      tenantId,
      adminUserId: admin.id,
      nonce: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(getJwtSecret());

    const authUrl = generateAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to initiate Google OAuth", 500);
  }
}
