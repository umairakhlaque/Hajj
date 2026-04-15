// ============================================
// AskVault — Tenant Detail API
// GET/PATCH/DELETE /api/admin/tenants/[id]
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";

const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  authMode: z.enum(["ANONYMOUS", "PASSWORD", "EMAIL_OTP", "GOOGLE", "CLERK"]).optional(),
  strictGroundedMode: z.boolean().optional(),
  showCitations: z.boolean().optional(),
  showSourceSnippets: z.boolean().optional(),
  allowCrossNotebook: z.boolean().optional(),
  systemPromptOverride: z.string().nullable().optional(),
  notebookLmId: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { branding: true, _count: { select: { users: true, notebookRecords: true, chatSessions: true } } },
    });
    if (!tenant) return apiNotFound("Tenant");
    return apiSuccess(tenant);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to fetch tenant", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = UpdateTenantSchema.parse(await request.json());

    const tenant = await prisma.tenant.update({ where: { id }, data: body });

    await writeAuditLog({
      tenantId: id,
      userId: admin.id,
      action: "TENANT_UPDATED",
      resourceType: "Tenant",
      resourceId: id,
      metadata: body,
      ipAddress: getClientIp(request),
    });

    return apiSuccess(tenant);
  } catch (err) {
    if (err instanceof z.ZodError) return apiValidationError(err.issues?.[0]?.message ?? "Validation error");
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiUnauthorized();
    return apiError("Failed to update tenant", 500);
  }
}
