// ============================================
// AskVault — Admin Notebooks API
// GET/POST /api/admin/notebooks
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiValidationError,
} from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";

const CreateNotebookSchema = z.object({
  tenantId: z.string(),
  displayName: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  connectorType: z
    .enum([
      "MANUAL_TEXT",
      "MANUAL_PDF",
      "GOOGLE_DRIVE",
      "GOOGLE_DOCS",
      "GOOGLE_SLIDES",
      "NOTEBOOKLM_ENTERPRISE",
      "WEB_URL",
      "YOUTUBE_TRANSCRIPT",
      "RAW_TEXT",
    ])
    .default("MANUAL_TEXT"),
  googleAccountConnectionId: z.string().optional(),
  externalNotebookId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  groupName: z.string().optional(),
  classification: z
    .enum(["PRIVATE", "INTERNAL", "TENANT_VISIBLE", "PUBLIC"])
    .optional()
    .default("INTERNAL"),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const where = tenantId
      ? { tenantId }
      : admin.role === "SUPER_ADMIN"
      ? {}
      : { tenantId: admin.tenantId ?? undefined };

    const notebooks = await prisma.notebookRecord.findMany({
      where,
      include: {
        googleAccountConnection: {
          select: { googleEmail: true, isActive: true },
        },
        _count: { select: { sourceRecords: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(notebooks);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch notebooks", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = CreateNotebookSchema.parse(await request.json());

    // Verify admin has access to this tenant
    if (
      admin.role !== "SUPER_ADMIN" &&
      admin.tenantId !== body.tenantId
    ) {
      return apiUnauthorized();
    }

    const notebook = await prisma.notebookRecord.create({
      data: {
        tenantId: body.tenantId,
        displayName: body.displayName,
        slug: body.slug,
        description: body.description,
        connectorType: body.connectorType,
        googleAccountConnectionId: body.googleAccountConnectionId,
        externalNotebookId: body.externalNotebookId,
        tags: body.tags,
        groupName: body.groupName,
        classification: body.classification,
      },
    });

    await writeAuditLog({
      tenantId: body.tenantId,
      userId: admin.id,
      action: "NOTEBOOK_CREATED",
      resourceType: "NotebookRecord",
      resourceId: notebook.id,
      metadata: { displayName: body.displayName, connectorType: body.connectorType },
      ipAddress: getClientIp(request),
    });

    return apiSuccess(notebook, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.errors[0]?.message ?? "Validation error");
    }
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to create notebook", 500);
  }
}
