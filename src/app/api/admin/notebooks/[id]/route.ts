// ============================================
// AskVault — Notebook Detail API
// GET/PATCH/DELETE /api/admin/notebooks/[id]
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";

const UpdateNotebookSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  groupName: z.string().optional(),
  classification: z.enum(["PRIVATE", "INTERNAL", "TENANT_VISIBLE", "PUBLIC"]).optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const notebook = await prisma.notebookRecord.findUnique({
      where: { id },
      include: {
        googleAccountConnection: { select: { googleEmail: true, isActive: true } },
        sourceRecords: { select: { id: true, title: true, status: true, _count: { select: { chunks: true } } } },
        _count: { select: { sourceRecords: true } },
      },
    });
    if (!notebook) return apiNotFound("Notebook");
    return apiSuccess(notebook);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to fetch notebook", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;
    const body = UpdateNotebookSchema.parse(await request.json());

    const notebook = await prisma.notebookRecord.update({ where: { id }, data: body });

    await writeAuditLog({
      tenantId: notebook.tenantId,
      userId: admin.id,
      action: "NOTEBOOK_UPDATED",
      resourceType: "NotebookRecord",
      resourceId: id,
      ipAddress: getClientIp(request),
    });

    return apiSuccess(notebook);
  } catch (err) {
    if (err instanceof z.ZodError) return apiValidationError(err.issues?.[0]?.message ?? "Validation error");
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to update notebook", 500);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser(["SUPER_ADMIN", "TENANT_ADMIN"]);
    const { id } = await params;

    // Soft delete — archive instead of hard delete
    const notebook = await prisma.notebookRecord.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });

    await writeAuditLog({
      tenantId: notebook.tenantId,
      userId: admin.id,
      action: "NOTEBOOK_DELETED",
      resourceType: "NotebookRecord",
      resourceId: id,
    });

    return apiSuccess({ id, archived: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to delete notebook", 500);
  }
}
