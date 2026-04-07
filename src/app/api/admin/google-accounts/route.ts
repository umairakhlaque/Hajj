// ============================================
// AskVault — Google Accounts API
// GET /api/admin/google-accounts
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();

    const accounts = await prisma.googleAccountConnection.findMany({
      where:
        admin.role === "SUPER_ADMIN"
          ? {}
          : { tenantId: admin.tenantId ?? undefined },
      select: {
        id: true,
        googleEmail: true,
        displayName: true,
        isActive: true,
        isRevoked: true,
        lastSyncAt: true,
        lastTokenRefreshAt: true,
        tokenRefreshFailures: true,
        scopes: true,
        tokenExpiresAt: true,
        createdAt: true,
        _count: { select: { notebookRecords: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Never expose encrypted tokens
    return apiSuccess(accounts);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch Google accounts", 500);
  }
}
