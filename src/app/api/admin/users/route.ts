// ============================================
// AskVault — Admin Users API
// GET /api/admin/users
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();

    const users = await prisma.user.findMany({
      where:
        admin.role === "SUPER_ADMIN"
          ? {}
          : { tenantId: admin.tenantId ?? undefined },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastSeenAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return apiSuccess(users);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch users", 500);
  }
}
