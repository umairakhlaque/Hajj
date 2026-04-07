// ============================================
// AskVault — Background Job Worker (pg-boss)
// Run: npm run jobs:worker
// ============================================

import { PgBoss } from "pg-boss";
import type { Job } from "pg-boss";
import { ingestNotebook, ingestSource } from "@/lib/ai/ingestion";
import { refreshGoogleToken } from "@/lib/connectors/google-drive/oauth-flow";
import { prisma } from "@/lib/db/client";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const boss = new PgBoss(DATABASE_URL);

// ---- Job Handlers ----

async function handleNotebookSync(jobs: Job<{ notebookId: string }>[]) {
  for (const job of jobs) {
    const { notebookId } = job.data;
    console.log(`[Worker] Syncing notebook: ${notebookId}`);

    await prisma.notebookRecord.update({
      where: { id: notebookId },
      data: { syncStatus: "RUNNING" },
    });

    try {
      const result = await ingestNotebook(notebookId);
      console.log(`[Worker] Notebook sync complete:`, result);
    } catch (err) {
      console.error(`[Worker] Notebook sync failed:`, err);
      await prisma.notebookRecord.update({
        where: { id: notebookId },
        data: {
          syncStatus: "FAILED",
          syncErrorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  }
}

async function handleSourceSync(jobs: Job<{ sourceId: string }>[]) {
  for (const job of jobs) {
    const { sourceId } = job.data;
    console.log(`[Worker] Syncing source: ${sourceId}`);

    try {
      const result = await ingestSource(sourceId);
      console.log(`[Worker] Source sync complete:`, result);
    } catch (err) {
      console.error(`[Worker] Source sync failed:`, err);
    }
  }
}

async function handleTokenRefreshCheck() {
  console.log("[Worker] Checking token freshness...");

  const expiringSoon = await prisma.googleAccountConnection.findMany({
    where: {
      isActive: true,
      isRevoked: false,
      OR: [
        { tokenExpiresAt: { lte: new Date(Date.now() + 10 * 60 * 1000) } },
        { tokenExpiresAt: null },
      ],
    },
    select: { id: true, googleEmail: true },
    take: 20,
  });

  for (const connection of expiringSoon) {
    console.log(`[Worker] Refreshing token for: ${connection.googleEmail}`);
    const result = await refreshGoogleToken(connection.id);
    if (!result.success) {
      console.warn(`[Worker] Token refresh failed: ${result.error}`);
    }
  }
}

async function handleStaleCleanup() {
  console.log("[Worker] Cleaning up stale chunks...");

  // Remove FAILED chunks older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.contentChunk.deleteMany({
    where: { status: "FAILED", createdAt: { lt: cutoff } },
  });

  console.log(`[Worker] Deleted ${deleted.count} stale chunks`);
}

// ---- Worker Startup ----

async function start() {
  console.log("[Worker] Starting AskVault job worker...");

  await boss.start();

  // Register handlers
  await boss.work<{ notebookId: string }>(
    "notebook-sync",
    { localConcurrency: 3 },
    handleNotebookSync
  );

  await boss.work<{ sourceId: string }>(
    "source-sync",
    { localConcurrency: 5 },
    handleSourceSync
  );

  // Schedule recurring jobs
  await boss.schedule(
    "token-refresh-check",
    "*/15 * * * *", // Every 15 minutes
    {},
    {}
  );

  await boss.schedule(
    "stale-cleanup",
    "0 2 * * *", // Daily at 2am
    {},
    {}
  );

  await boss.work("token-refresh-check", handleTokenRefreshCheck);
  await boss.work("stale-cleanup", handleStaleCleanup);

  console.log("[Worker] All job handlers registered. Waiting for jobs...");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await boss.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Interrupted, shutting down...");
  await boss.stop();
  process.exit(0);
});

start().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

/**
 * Queue a notebook sync job externally.
 */
export async function queueNotebookSync(notebookId: string): Promise<string | null> {
  return boss.send("notebook-sync", { notebookId }, { retryLimit: 2 });
}

/**
 * Queue a source sync job externally.
 */
export async function queueSourceSync(sourceId: string): Promise<string | null> {
  return boss.send("source-sync", { sourceId }, { retryLimit: 2 });
}
