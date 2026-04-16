// ============================================
// AskVault — PDF Upload API
// POST /api/admin/sources/upload
// Accepts a multipart/form-data PDF upload,
// extracts text, and creates a SourceRecord.
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from "@/lib/utils/api-response";
import { normalizeText } from "@/lib/ai/chunker";
import crypto from "crypto";
import pdfParse from "pdf-parse";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const notebookRecordId = formData.get("notebookRecordId") as string | null;
    const title = formData.get("title") as string | null;
    const autoApprove = formData.get("autoApprove") === "true";

    if (!file) return apiValidationError("No file provided");
    if (!notebookRecordId) return apiValidationError("notebookRecordId is required");
    if (!title?.trim()) return apiValidationError("Title is required");
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      return apiValidationError("Only PDF files are supported");
    }
    if (file.size > 20 * 1024 * 1024) {
      return apiValidationError("File too large (max 20 MB)");
    }

    // Verify notebook exists
    const notebook = await prisma.notebookRecord.findUnique({
      where: { id: notebookRecordId },
    });
    if (!notebook) return apiError("Notebook not found", 404);

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawContent: string;
    try {
      const parsed = await pdfParse(buffer);
      rawContent = parsed.text?.trim() ?? "";
    } catch {
      return apiError("Failed to extract text from PDF. Make sure it is not scanned/image-only.", 422);
    }

    if (!rawContent) {
      return apiValidationError("PDF contains no extractable text (it may be a scanned image PDF)");
    }

    const normalizedContent = normalizeText(rawContent);
    const contentHash = crypto.createHash("sha256").update(normalizedContent).digest("hex");
    const wordCount = normalizedContent.split(/\s+/).length;

    // Check for duplicate
    const duplicate = await prisma.sourceRecord.findFirst({
      where: { notebookRecordId, contentHash },
    });
    if (duplicate) {
      return apiValidationError(`Duplicate content (matches: "${duplicate.title}")`);
    }

    const source = await prisma.sourceRecord.create({
      data: {
        notebookRecordId,
        title: title.trim(),
        connectorType: "MANUAL_PDF",
        rawContent,
        normalizedContent,
        contentHash,
        wordCount,
        characterCount: normalizedContent.length,
        mimeType: "application/pdf",
        classification: "INTERNAL",
        status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
      },
    });

    return apiSuccess(source, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    console.error("[PDF Upload]", err);
    return apiError("Failed to upload PDF", 500);
  }
}
