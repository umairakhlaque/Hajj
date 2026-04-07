// ============================================
// AskVault — Sync Jobs List
// GET /api/admin/sync/jobs
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();

    const jobs = await prisma.syncJob.findMany({
      where:
        admin.role === "SUPER_ADMIN"
          ? {}
          : { tenantId: admin.tenantId ?? undefined },
      include: {
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiSuccess(jobs);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch sync jobs", 500);
  }
}
