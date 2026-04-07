// ============================================
// AskVault — Admin Sources API
// GET/POST /api/admin/sources
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
import { normalizeText } from "@/lib/ai/chunker";
import crypto from "crypto";

const CreateSourceSchema = z.object({
  notebookRecordId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  connectorType: z.enum([
    "MANUAL_TEXT", "MANUAL_PDF", "GOOGLE_DRIVE", "GOOGLE_DOCS",
    "GOOGLE_SLIDES", "NOTEBOOKLM_ENTERPRISE", "WEB_URL", "YOUTUBE_TRANSCRIPT", "RAW_TEXT",
  ]),
  rawContent: z.string().optional(),
  externalUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  classification: z.enum(["PRIVATE", "INTERNAL", "TENANT_VISIBLE", "PUBLIC"]).default("INTERNAL"),
  noDirectQuote: z.boolean().default(false),
  tags: z.array(z.string()).optional().default([]),
  // Auto-approve or leave in DRAFT
  autoApprove: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const notebookRecordId = searchParams.get("notebookRecordId");
    const status = searchParams.get("status");

    const sources = await prisma.sourceRecord.findMany({
      where: {
        ...(notebookRecordId ? { notebookRecordId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Never return rawContent in list views
    return apiSuccess(
      sources.map(({ rawContent, normalizedContent, ...s }) => s)
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch sources", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = CreateSourceSchema.parse(await request.json());

    // Verify notebook exists and admin has access
    const notebook = await prisma.notebookRecord.findUnique({
      where: { id: body.notebookRecordId },
    });
    if (!notebook) return apiError("Notebook not found", 404);

    // Normalize content if provided
    let normalizedContent: string | undefined;
    let contentHash: string | undefined;
    let wordCount: number | undefined;
    let characterCount: number | undefined;

    if (body.rawContent) {
      normalizedContent = normalizeText(body.rawContent);
      contentHash = crypto.createHash("sha256").update(normalizedContent).digest("hex");
      wordCount = normalizedContent.split(/\s+/).length;
      characterCount = normalizedContent.length;

      // Check for duplicate
      const duplicate = await prisma.sourceRecord.findFirst({
        where: { notebookRecordId: body.notebookRecordId, contentHash },
      });
      if (duplicate) {
        return apiValidationError(`Duplicate content detected (matches source: ${duplicate.title})`);
      }
    }

    const source = await prisma.sourceRecord.create({
      data: {
        notebookRecordId: body.notebookRecordId,
        title: body.title,
        description: body.description,
        connectorType: body.connectorType,
        rawContent: body.rawContent,
        normalizedContent,
        contentHash,
        wordCount,
        characterCount,
        externalUrl: body.externalUrl,
        externalId: body.externalId,
        classification: body.classification,
        noDirectQuote: body.noDirectQuote,
        tags: body.tags,
        status: body.autoApprove ? "APPROVED" : "DRAFT",
      },
    });

    await writeAuditLog({
      tenantId: notebook.tenantId,
      userId: admin.id,
      action: "SOURCE_CREATED",
      resourceType: "SourceRecord",
      resourceId: source.id,
      metadata: { title: body.title, status: source.status },
      ipAddress: getClientIp(request),
    });

    return apiSuccess(source, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.errors[0]?.message ?? "Validation error");
    }
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to create source", 500);
  }
}
