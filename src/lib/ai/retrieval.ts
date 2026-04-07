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
  scopeType?: "all" | "notebook" | "collection";
  scopeId?: string;
  allowedClassifications?: string[];
  topK?: number;
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

  // Step 2: Resolve collection scope to notebook IDs
  let notebookIds: string[] = [];
  if (scopeType === "collection" && scopeId) {
    const mappings = await prisma.notebookCollectionMapping.findMany({
      where: { notebookCollectionId: scopeId },
      select: { notebookRecordId: true },
    });
    notebookIds = mappings.map((m) => m.notebookRecordId);
    if (notebookIds.length === 0) {
      return { chunks: [], queryEmbedding };
    }
  }

  // Step 3: Execute vector similarity search
  // We store embeddings as bytea and cast to vector at query time
  type RawRow = {
    chunkId: string;
    chunkText: string;
    sectionHeading: string | null;
    notebookName: string;
    sourceTitle: string;
    score: number;
  };

  let rows: RawRow[];

  if (scopeType === "notebook" && scopeId) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        cc.id AS "chunkId",
        cc."chunkText",
        cc."sectionHeading",
        nr."displayName" AS "notebookName",
        sr.title AS "sourceTitle",
        1 - (cc.embedding::vector <=> ${vectorLiteral}::vector) AS score
      FROM "ContentChunk" cc
      JOIN "SourceRecord" sr ON cc."sourceRecordId" = sr.id
      JOIN "NotebookRecord" nr ON cc."notebookRecordId" = nr.id
      WHERE
        cc."tenantId" = ${tenantId}
        AND cc.status = 'EMBEDDED'
        AND sr.status = 'APPROVED'
        AND nr."isActive" = true
        AND nr."isArchived" = false
        AND cc."notebookRecordId" = ${scopeId}
        AND cc."classification" = ANY(${allowedClassifications}::text[])
        AND (1 - (cc.embedding::vector <=> ${vectorLiteral}::vector)) > ${minScore}
      ORDER BY cc.embedding::vector <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  } else if (scopeType === "collection" && notebookIds.length > 0) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        cc.id AS "chunkId",
        cc."chunkText",
        cc."sectionHeading",
        nr."displayName" AS "notebookName",
        sr.title AS "sourceTitle",
        1 - (cc.embedding::vector <=> ${vectorLiteral}::vector) AS score
      FROM "ContentChunk" cc
      JOIN "SourceRecord" sr ON cc."sourceRecordId" = sr.id
      JOIN "NotebookRecord" nr ON cc."notebookRecordId" = nr.id
      WHERE
        cc."tenantId" = ${tenantId}
        AND cc.status = 'EMBEDDED'
        AND sr.status = 'APPROVED'
        AND nr."isActive" = true
        AND nr."isArchived" = false
        AND cc."notebookRecordId" = ANY(${notebookIds}::text[])
        AND cc."classification" = ANY(${allowedClassifications}::text[])
        AND (1 - (cc.embedding::vector <=> ${vectorLiteral}::vector)) > ${minScore}
      ORDER BY cc.embedding::vector <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        cc.id AS "chunkId",
        cc."chunkText",
        cc."sectionHeading",
        nr."displayName" AS "notebookName",
        sr.title AS "sourceTitle",
        1 - (cc.embedding::vector <=> ${vectorLiteral}::vector) AS score
      FROM "ContentChunk" cc
      JOIN "SourceRecord" sr ON cc."sourceRecordId" = sr.id
      JOIN "NotebookRecord" nr ON cc."notebookRecordId" = nr.id
      WHERE
        cc."tenantId" = ${tenantId}
        AND cc.status = 'EMBEDDED'
        AND sr.status = 'APPROVED'
        AND nr."isActive" = true
        AND nr."isArchived" = false
        AND cc."classification" = ANY(${allowedClassifications}::text[])
        AND (1 - (cc.embedding::vector <=> ${vectorLiteral}::vector)) > ${minScore}
      ORDER BY cc.embedding::vector <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  }

  // Step 4: Map to RetrievedChunk
  const chunks: RetrievedChunk[] = rows.map((row) => ({
    chunkId: row.chunkId,
    chunkText: row.chunkText,
    sectionHeading: row.sectionHeading ?? undefined,
    notebookName: row.notebookName,
    sourceTitle: row.sourceTitle,
    score: parseFloat(String(row.score)),
  }));

  return { chunks, queryEmbedding };
}

/**
 * Calculate answer confidence from retrieved chunks (0–1).
 */
export function calculateConfidence(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  const topScore = chunks[0].score;
  const avgScore = chunks.reduce((s, c) => s + c.score, 0) / chunks.length;
  return Math.min(1, topScore * 0.6 + avgScore * 0.4);
}
