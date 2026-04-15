// ============================================
// AskVault — Embeddings via Jina AI (free tier)
// Drop-in replacement for OpenAI embeddings
// ============================================

import OpenAI from "openai";

let jinaClient: OpenAI | null = null;

function getJina(): OpenAI {
  if (!jinaClient) {
    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey) throw new Error("JINA_API_KEY not set");
    jinaClient = new OpenAI({
      apiKey,
      baseURL: "https://api.jina.ai/v1",
    });
  }
  return jinaClient;
}

export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "jina-embeddings-v3";
export const EMBEDDING_DIMENSIONS = parseInt(
  process.env.EMBEDDING_DIMENSIONS ?? "1024"
);

/**
 * Generate embeddings for a single text.
 */
export async function embedText(text: string): Promise<number[]> {
  const jina = getJina();
  const response = await jina.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),
  } as Parameters<typeof jina.embeddings.create>[0]);
  return (response.data[0] as { embedding: number[] }).embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const jina = getJina();
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8191));
    const response = await jina.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    } as Parameters<typeof jina.embeddings.create>[0]);
    results.push(...response.data.map((d) => (d as { embedding: number[] }).embedding));
  }

  return results;
}

/**
 * Convert a float array to Postgres vector literal string.
 * e.g. [0.1, 0.2, 0.3] -> '[0.1,0.2,0.3]'
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
