// ============================================
// AskVault — Source Approval API
// POST /api/admin/sources/[id]/approve
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";
import { ingestSource } from "@/lib/ai/ingestion";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action: "approve" | "reject" = body.action ?? "approve";

    const source = await prisma.sourceRecord.findUnique({
      where: { id },
      include: { notebookRecord: true },
    });

    if (!source) return apiError("Source not found", 404);

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    await prisma.sourceRecord.update({
      where: { id },
      data: { status: newStatus },
    });

    await writeAuditLog({
      tenantId: source.notebookRecord.tenantId,
      userId: admin.id,
      action: action === "approve" ? "SOURCE_APPROVED" : "SOURCE_REJECTED",
      resourceType: "SourceRecord",
      resourceId: id,
      ipAddress: getClientIp(request),
    });

    // If approved, trigger ingestion immediately
    if (action === "approve") {
      ingestSource(id).catch((err) =>
        console.error("[SourceApproval] Ingestion failed:", err)
      );
    }

    return apiSuccess({ id, status: newStatus });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to update source status", 500);
  }
}
