// ============================================
// AskVault — NotebookLM Engine
// Uses notebooklm-sdk to query real NotebookLM
// notebooks behind the scenes. Users only see
// the AskVault chat interface.
// ============================================

import { NotebookLMClient } from "notebooklm-sdk";
import { sanitizeUserQuery } from "@/lib/security/prompt-injection";
import path from "path";
import os from "os";

// Singleton client
let nlmClient: NotebookLMClient | null = null;

async function getClient(): Promise<NotebookLMClient> {
  if (!nlmClient) {
    // Session file saved by: npx notebooklm-sdk login
    const cookiesFile = process.env.NOTEBOOKLM_SESSION_FILE ??
      path.join(os.homedir(), ".notebooklm", "session.json");

    nlmClient = await NotebookLMClient.connect({ cookiesFile });
  }
  return nlmClient;
}

// Cache conversation IDs per session to support follow-up questions
const conversationCache = new Map<string, string>();

export interface NotebookLMChatOptions {
  notebookId: string;
  sessionId: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  systemPromptOverride?: string | null;
}

export interface NotebookLMChatResult {
  answer: string;
  isGrounded: boolean;
  modelUsed: string;
  latencyMs: number;
  injectionDetected: boolean;
  citations: { sourceTitle: string; notebookName: string }[];
}

/**
 * Send a question to a real NotebookLM notebook and return the answer.
 * The user only sees the AskVault chat box — NotebookLM is hidden.
 */
export async function askNotebookLM(
  userQuery: string,
  options: NotebookLMChatOptions
): Promise<NotebookLMChatResult> {
  const startTime = Date.now();
  const { notebookId, sessionId } = options;

  // Sanitize input
  const { sanitized, injectionDetected } = sanitizeUserQuery(userQuery);

  const client = await getClient();

  // Get existing conversation ID for follow-up questions
  const conversationId = conversationCache.get(sessionId) ?? undefined;

  const result = await client.chat.ask(notebookId, sanitized, {
    conversationId,
  });

  // Cache conversation ID for follow-up questions
  conversationCache.set(sessionId, result.conversationId);

  // Build citations from references
  const citations = result.references.map((ref) => ({
    sourceTitle: ref.title ?? "Source",
    notebookName: "NotebookLM",
  }));

  return {
    answer: result.answer,
    isGrounded: true,
    modelUsed: "notebooklm",
    latencyMs: Date.now() - startTime,
    injectionDetected,
    citations: citations.slice(0, 5),
  };
}
