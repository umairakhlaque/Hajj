// ============================================
// AskVault — Disconnect Google Account
// DELETE /api/admin/google-accounts/[id]/disconnect
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;

    const connection = await prisma.googleAccountConnection.findUnique({ where: { id } });
    if (!connection) return apiError("Account not found", 404);

    await prisma.googleAccountConnection.update({
      where: { id },
      data: { isActive: false, isRevoked: true },
    });

    await writeAuditLog({
      tenantId: connection.tenantId,
      userId: admin.id,
      action: "GOOGLE_ACCOUNT_DISCONNECTED",
      resourceType: "GoogleAccountConnection",
      resourceId: id,
      metadata: { googleEmail: connection.googleEmail },
      ipAddress: getClientIp(request),
    });

    return apiSuccess({ id, disconnected: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to disconnect account", 500);
  }
}
