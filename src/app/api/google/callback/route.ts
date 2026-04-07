// ============================================
// AskVault — Google OAuth Callback
// GET /api/google/callback?code=...&state=...
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { handleOAuthCallback } from "@/lib/connectors/google-drive/oauth-flow";
import { getClientIp } from "@/lib/utils/audit";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.ADMIN_SECRET_KEY ?? "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/google-accounts?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/google-accounts?error=missing_params", request.url)
    );
  }

  try {
    // Verify state JWT
    const { payload } = await jwtVerify(state, getJwtSecret());
    const { tenantId, adminUserId } = payload as {
      tenantId: string;
      adminUserId: string;
    };

    const result = await handleOAuthCallback({
      code,
      tenantId,
      connectedByUserId: adminUserId,
      ipAddress: getClientIp(request),
    });

    if (result.success) {
      return NextResponse.redirect(
        new URL(
          `/admin/google-accounts?success=1&email=${encodeURIComponent(result.googleEmail ?? "")}`,
          request.url
        )
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/admin/google-accounts?error=${encodeURIComponent(result.error ?? "oauth_failed")}`,
          request.url
        )
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL("/admin/google-accounts?error=invalid_state", request.url)
    );
  }
}
