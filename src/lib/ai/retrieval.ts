// ============================================
// AskVault — RAG Retrieval Pipeline
// Semantic search with pgvector + security filtering
// ============================================

import { prisma } from "@/lib/db/client";
import { embedText, toVectorLiteral } from "./embeddings";
import type { RetrievedChunk } from "@/lib/security/prompt-injection";

export interface RetrievalOptions {
  tenantId: string;
  query: string;
  // Scope: which notebooks/collections to search
  scopeType?: "all" | "notebook" | "collection";
  scopeId?: string;
  // Security: classification level allowed for this user
  allowedClassifications?: string[];
  // Number of top results
  topK?: number;
  // Minimum similarity score (0-1)
  minScore?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  queryEmbedding: number[];
}

/**
 * Perform semantic vector search against content chunks.
 * Applies tenant isolation and classification filtering at query time.
 */
export async function retrieveRelevantChunks(
  options: RetrievalOptions
): Promise<RetrievalResult> {
  const {
    tenantId,
    query,
    scopeType = "all",
    scopeId,
    allowedClassifications = ["PUBLIC", "TENANT_VISIBLE", "INTERNAL"],
    topK = 8,
    minScore = 0.5,
  } = options;

  // Step 1: Embed the query
  const queryEmbedding = await embedText(query);
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  // Step 2: Build scope filter SQL
  let scopeFilter = "";
  const params: unknown[] = [tenantId, vectorLiteral, topK];

  if (scopeType === "notebook" && scopeId) {
    scopeFilter = `AND cc."notebookRecordId" = $${params.length + 1}`;
    params.push(scopeId);
  } else if (scopeType === "collection" && scopeId) {
    // Resolve collection -> notebook IDs
    const mappings = await prisma.notebookCollectionMapping.findMany({
      where: { notebookCollectionId: scopeId },
      select: { notebookRecordId: true },
    });
    const notebookIds = mappings.map((m) => m.notebookRecordId);
    if (notebookIds.length === 0) {
      return { chunks: [], queryEmbedding };
    }
    scopeFilter = `AND cc."notebookRecordId" = ANY($${params.length + 1}::text[])`;
    params.push(notebookIds);
  }

  // Step 3: Classification filter
  const classFilter = `AND cc."classification" = ANY($${params.length + 1}::text[])`;
  params.push(allowedClassifications);

  // Step 4: Execute vector similarity search using pgvector cosine distance
  // Lower cosine distance = higher similarity
  // We convert: similarity = 1 - cosine_distance
  const sql = `
    SELECT
      cc.id AS "chunkId",
      cc."chunkText",
      cc."sectionHeading",
      cc."chunkIndex",
      nr."displayName" AS "notebookName",
      sr.title AS "sourceTitle",
      1 - (cc.embedding <=> $2::vector) AS score
    FROM "ContentChunk" cc
    JOIN "SourceRecord" sr ON cc."sourceRecordId" = sr.id
    JOIN "NotebookRecord" nr ON cc."notebookRecordId" = nr.id
    WHERE
      cc."tenantId" = $1
      AND cc.status = 'EMBEDDED'
      AND sr.status = 'APPROVED'
      AND nr."isActive" = true
      AND nr."isArchived" = false
      ${scopeFilter}
      ${classFilter}
      AND (1 - (cc.embedding <=> $2::vector)) > ${minScore}
    ORDER BY cc.embedding <=> $2::vector
    LIMIT $3
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (prisma as any).$queryRawUnsafe(sql, ...params) as Array<{
    chunkId: string;
    chunkText: string;
    sectionHeading: string | null;
    chunkIndex: number;
    notebookName: string;
    sourceTitle: string;
    score: number;
  }>;

  // Step 5: Re-rank by score (already sorted by cosine distance, but normalize)
  const chunks: RetrievedChunk[] = rows.map((row) => ({
    chunkId: row.chunkId,
    chunkText: row.chunkText,
    sectionHeading: row.sectionHeading ?? undefined,
    notebookName: row.notebookName,
    sourceTitle: row.sourceTitle,
    score: parseFloat(row.score.toString()),
  }));

  return { chunks, queryEmbedding };
}

/**
 * Calculate a simple confidence score based on retrieval results.
 * Returns 0-1 where 1 = high confidence grounded answer.
 */
export function calculateConfidence(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  const topScore = chunks[0].score;
  const avgScore = chunks.reduce((s, c) => s + c.score, 0) / chunks.length;
  // Weighted: top score matters more
  return Math.min(1, topScore * 0.6 + avgScore * 0.4);
}
