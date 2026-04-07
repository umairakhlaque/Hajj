// ============================================
// AskVault — KnowledgeConnector Base Interface
// All connectors implement this interface
// ============================================

export interface ConnectorSource {
  externalId?: string;
  externalUrl?: string;
  title: string;
  description?: string;
  mimeType?: string;
  rawContent: string;
  author?: string;
  publishedAt?: Date;
  sourceType: string;
  tags?: string[];
}

export interface ConnectorNotebook {
  externalId: string;
  displayName: string;
  description?: string;
  sources: ConnectorSource[];
}

export interface ConnectorHealth {
  isConnected: boolean;
  accountEmail?: string;
  error?: string;
  lastCheckedAt: Date;
}

/**
 * Base interface all KnowledgeConnectors must implement.
 * This abstraction allows the system to work with or without
 * NotebookLM/Google APIs being available.
 */
export interface KnowledgeConnector {
  readonly type: string;
  readonly displayName: string;

  /**
   * Test the connection and return health status.
   */
  healthCheck(): Promise<ConnectorHealth>;

  /**
   * Discover available notebooks/sources from the upstream system.
   * Returns empty array if discovery is not supported.
   */
  discoverNotebooks(): Promise<ConnectorNotebook[]>;

  /**
   * Fetch content for a specific source given its external ID or URL.
   */
  fetchSourceContent(
    externalId: string,
    options?: Record<string, unknown>
  ): Promise<ConnectorSource | null>;

  /**
   * Sync a notebook's sources into the provided callback.
   * The callback receives each source as it becomes available.
   */
  syncNotebook(
    externalNotebookId: string,
    onSource: (source: ConnectorSource) => Promise<void>
  ): Promise<{ synced: number; failed: number; errors: string[] }>;
}
