// ============================================
// AskVault — Intelligent Text Chunker
// Target: 400-900 tokens, 50-150 token overlap
// Preserves section semantics and headings
// ============================================

export interface TextChunk {
  chunkText: string;
  chunkIndex: number;
  sectionHeading?: string;
  tokenCount: number;
  pageNumber?: number;
}

// Approximate token count (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const TARGET_CHUNK_TOKENS = 700;
const MIN_CHUNK_TOKENS = 100;
const OVERLAP_TOKENS = 100;
const MAX_CHUNK_TOKENS = 900;

/**
 * Extract sections from markdown-like content, respecting headings.
 */
function extractSections(text: string): Array<{ heading?: string; content: string }> {
  const lines = text.split("\n");
  const sections: Array<{ heading?: string; content: string }> = [];
  let currentHeading: string | undefined;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
        currentLines = [];
      }
      currentHeading = headingMatch[1].trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
  }

  return sections.filter((s) => s.content.length > 0);
}

/**
 * Split a text block into overlapping chunks of target token size.
 */
function splitIntoChunks(
  text: string,
  heading: string | undefined,
  startIndex: number,
  pageNumber?: number
): TextChunk[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;
  let overlapBuffer: string[] = [];
  let chunkIndex = startIndex;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > MAX_CHUNK_TOKENS && current.length > 0) {
      const chunkText = current.join(" ").trim();
      if (estimateTokens(chunkText) >= MIN_CHUNK_TOKENS) {
        chunks.push({
          chunkText,
          chunkIndex: chunkIndex++,
          sectionHeading: heading,
          tokenCount: estimateTokens(chunkText),
          pageNumber,
        });
      }

      // Build overlap: take last sentences that fit in OVERLAP_TOKENS
      overlapBuffer = [];
      let overlapTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i]);
        if (overlapTokens + t > OVERLAP_TOKENS) break;
        overlapBuffer.unshift(current[i]);
        overlapTokens += t;
      }

      current = [...overlapBuffer, sentence];
      currentTokens = overlapBuffer.reduce((a, s) => a + estimateTokens(s), 0) + sentenceTokens;
    } else {
      current.push(sentence);
      currentTokens += sentenceTokens;
    }
  }

  // Flush remaining
  if (current.length > 0) {
    const chunkText = current.join(" ").trim();
    if (estimateTokens(chunkText) >= MIN_CHUNK_TOKENS) {
      chunks.push({
        chunkText,
        chunkIndex: chunkIndex++,
        sectionHeading: heading,
        tokenCount: estimateTokens(chunkText),
        pageNumber,
      });
    }
  }

  return chunks;
}

/**
 * Main chunking function. Takes normalized text and returns semantic chunks.
 */
export function chunkText(
  text: string,
  options: { preserveHeadings?: boolean; pageNumber?: number } = {}
): TextChunk[] {
  const { preserveHeadings = true } = options;

  if (!text || text.trim().length === 0) return [];

  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  if (preserveHeadings) {
    const sections = extractSections(text);
    for (const section of sections) {
      const sectionChunks = splitIntoChunks(
        section.content,
        section.heading,
        globalIndex,
        options.pageNumber
      );
      allChunks.push(...sectionChunks);
      globalIndex += sectionChunks.length;
    }
  } else {
    allChunks.push(...splitIntoChunks(text, undefined, 0, options.pageNumber));
  }

  return allChunks;
}

/**
 * Normalize raw text: clean OCR noise, normalize whitespace, fix encoding issues.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing whitespace per line
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    // Fix common OCR artifacts
    .replace(/[^\S\n]+/g, " ")
    .trim();
}
