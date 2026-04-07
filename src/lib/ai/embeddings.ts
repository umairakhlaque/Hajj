// ============================================
// AskVault — OpenAI Embeddings
// ============================================

import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = parseInt(
  process.env.OPENAI_EMBEDDING_DIMENSIONS ?? "3072"
);

/**
 * Generate embeddings for a single text.
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191), // OpenAI token limit guard
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Respects OpenAI batch limit of 2048 inputs.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8191));
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    results.push(...response.data.map((d) => d.embedding));
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
