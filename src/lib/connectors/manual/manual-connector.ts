// ============================================
// AskVault — Manual Upload Connector
// Mode A: Admin manually pastes or uploads content
// Highest privacy control — no external API dependency
// ============================================

import type {
  KnowledgeConnector,
  ConnectorSource,
  ConnectorNotebook,
  ConnectorHealth,
} from "../base";

export class ManualUploadConnector implements KnowledgeConnector {
  readonly type = "MANUAL_TEXT";
  readonly displayName = "Manual Content Upload";

  async healthCheck(): Promise<ConnectorHealth> {
    return {
      isConnected: true,
      error: undefined,
      lastCheckedAt: new Date(),
    };
  }

  async discoverNotebooks(): Promise<ConnectorNotebook[]> {
    // Manual connector has no upstream to discover from
    return [];
  }

  async fetchSourceContent(
    externalId: string
  ): Promise<ConnectorSource | null> {
    // Manual sources don't have an external ID to fetch from
    return null;
  }

  async syncNotebook(
    externalNotebookId: string,
    onSource: (source: ConnectorSource) => Promise<void>
  ): Promise<{ synced: number; failed: number; errors: string[] }> {
    // No-op — manual sources are pushed by admin, not pulled
    return { synced: 0, failed: 0, errors: [] };
  }

  /**
   * Create a ConnectorSource from pasted text — used directly by admin UI.
   */
  static createFromText(params: {
    title: string;
    content: string;
    author?: string;
    tags?: string[];
  }): ConnectorSource {
    return {
      title: params.title,
      rawContent: params.content,
      sourceType: "text",
      author: params.author,
      tags: params.tags,
      mimeType: "text/plain",
    };
  }
}
