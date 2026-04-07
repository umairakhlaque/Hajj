// ============================================
// AskVault — Sync Trigger API
// POST /api/admin/sync
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from "@/lib/utils/api-response";
import { ingestNotebook, ingestSource } from "@/lib/ai/ingestion";

const SyncRequestSchema = z.object({
  type: z.enum(["notebook", "source"]),
  resourceId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = SyncRequestSchema.parse(await request.json());

    // Create a sync job record
    const syncJob = await prisma.syncJob.create({
      data: {
        tenantId:
          body.type === "notebook"
            ? (
                await prisma.notebookRecord.findUnique({
                  where: { id: body.resourceId },
                  select: { tenantId: true },
                })
              )?.tenantId ?? ""
            : (
                await prisma.sourceRecord.findUnique({
                  where: { id: body.resourceId },
                  include: { notebookRecord: { select: { tenantId: true } } },
                })
              )?.notebookRecord.tenantId ?? "",
        jobType:
          body.type === "notebook" ? "NOTEBOOK_SYNC" : "SOURCE_SYNC",
        status: "RUNNING",
        resourceType: body.type,
        resourceId: body.resourceId,
        startedAt: new Date(),
      },
    });

    // Run ingestion async (fire-and-forget with status update)
    const runIngestion = async () => {
      try {
        let result;
        if (body.type === "notebook") {
          result = await ingestNotebook(body.resourceId);
          await prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
              status: result.errors.length === 0 ? "COMPLETED" : "FAILED",
              completedAt: new Date(),
              totalItems: result.sourcesProcessed,
              processedItems: result.sourcesProcessed,
              failedItems: result.errors.length,
              logs: result.errors.map((e) => ({ level: "error", message: e })),
            },
          });
        } else {
          result = await ingestSource(body.resourceId);
          await prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
              status: result.error ? "FAILED" : "COMPLETED",
              completedAt: new Date(),
              totalItems: result.chunksCreated,
              processedItems: result.chunksEmbedded,
              errorMessage: result.error,
            },
          });
        }
      } catch (err) {
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          },
        });
      }
    };

    runIngestion();

    return apiSuccess({ jobId: syncJob.id, status: "RUNNING" }, 202);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.issues?.[0]?.message ?? "Invalid request");
    }
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Sync failed", 500);
  }
}
