// ============================================
// AskVault — Source Ingestion Pipeline
// Processes approved sources into chunks + embeddings
// ============================================

import { prisma } from "@/lib/db/client";
import { chunkText, normalizeText } from "./chunker";
import { embedBatch, toVectorLiteral, EMBEDDING_MODEL } from "./embeddings";
import crypto from "crypto";

/**
 * Process a single SourceRecord: normalize -> chunk -> embed -> store.
 * This is called by background jobs or manual sync triggers.
 */
export async function ingestSource(sourceRecordId: string): Promise<{
  chunksCreated: number;
  chunksEmbedded: number;
  error?: string;
}> {
  const source = await prisma.sourceRecord.findUnique({
    where: { id: sourceRecordId },
    include: { notebookRecord: { select: { tenantId: true, id: true } } },
  });

  if (!source) throw new Error(`SourceRecord not found: ${sourceRecordId}`);
  if (source.status !== "APPROVED") {
    throw new Error(`Source must be APPROVED before ingestion. Status: ${source.status}`);
  }

  const rawText = source.normalizedContent ?? source.rawContent;
  if (!rawText) throw new Error("Source has no content to ingest");

  try {
    // Step 1: Normalize text
    const normalized = normalizeText(rawText);

    // Step 2: Content hash for dedup
    const contentHash = crypto
      .createHash("sha256")
      .update(normalized)
      .digest("hex");

    // Update source with normalized content + hash
    await prisma.sourceRecord.update({
      where: { id: sourceRecordId },
      data: {
        normalizedContent: normalized,
        contentHash,
        wordCount: normalized.split(/\s+/).length,
        characterCount: normalized.length,
      },
    });

    // Step 3: Delete old chunks for this source (re-ingestion)
    await prisma.contentChunk.deleteMany({
      where: { sourceRecordId },
    });

    // Step 4: Chunk the text
    const chunks = chunkText(normalized, { preserveHeadings: true });
    if (chunks.length === 0) {
      return { chunksCreated: 0, chunksEmbedded: 0 };
    }

    // Step 5: Create chunk records (without embeddings first)
    await prisma.contentChunk.createMany({
      data: chunks.map((chunk) => ({
        sourceRecordId,
        notebookRecordId: source.notebookRecordId,
        tenantId: source.notebookRecord.tenantId,
        chunkText: chunk.chunkText,
        chunkIndex: chunk.chunkIndex,
        sectionHeading: chunk.sectionHeading,
        tokenCount: chunk.tokenCount,
        pageNumber: chunk.pageNumber,
        status: "PENDING",
        classification: source.classification,
      })),
    });

    // Step 6: Fetch created chunks
    const createdChunks = await prisma.contentChunk.findMany({
      where: { sourceRecordId },
      orderBy: { chunkIndex: "asc" },
    });

    // Step 7: Generate embeddings in batches
    const texts = createdChunks.map((c) => c.chunkText);
    const embeddings = await embedBatch(texts);

    // Step 8: Update each chunk with its embedding using raw SQL (pgvector)
    let embeddedCount = 0;
    for (let i = 0; i < createdChunks.length; i++) {
      const chunk = createdChunks[i];
      const embedding = embeddings[i];
      if (!embedding || embedding.length === 0) continue;

      const vectorLiteral = toVectorLiteral(embedding);
      await (prisma as any).$executeRawUnsafe(
        `UPDATE "ContentChunk" SET embedding = $1::vector, status = 'EMBEDDED', "embeddingModel" = $2, "updatedAt" = NOW() WHERE id = $3`,
        vectorLiteral,
        EMBEDDING_MODEL,
        chunk.id
      );
      embeddedCount++;
    }

    // Step 9: Mark failed chunks
    await prisma.contentChunk.updateMany({
      where: { sourceRecordId, status: "PENDING" },
      data: { status: "FAILED" },
    });

    // Step 10: Update source sync timestamp
    await prisma.sourceRecord.update({
      where: { id: sourceRecordId },
      data: { syncedAt: new Date() },
    });

    return {
      chunksCreated: createdChunks.length,
      chunksEmbedded: embeddedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.sourceRecord.update({
      where: { id: sourceRecordId },
      data: { syncError: message },
    });
    return { chunksCreated: 0, chunksEmbedded: 0, error: message };
  }
}

/**
 * Ingest all approved, unsynced sources for a notebook.
 */
export async function ingestNotebook(notebookRecordId: string): Promise<{
  sourcesProcessed: number;
  totalChunks: number;
  totalEmbedded: number;
  errors: string[];
}> {
  const sources = await prisma.sourceRecord.findMany({
    where: {
      notebookRecordId,
      status: "APPROVED",
    },
  });

  let totalChunks = 0;
  let totalEmbedded = 0;
  const errors: string[] = [];

  for (const source of sources) {
    const result = await ingestSource(source.id);
    totalChunks += result.chunksCreated;
    totalEmbedded += result.chunksEmbedded;
    if (result.error) errors.push(`${source.title}: ${result.error}`);
  }

  await prisma.notebookRecord.update({
    where: { id: notebookRecordId },
    data: { syncStatus: errors.length === 0 ? "SUCCESS" : "PARTIAL", lastSyncAt: new Date() },
  });

  return {
    sourcesProcessed: sources.length,
    totalChunks,
    totalEmbedded,
    errors,
  };
}
