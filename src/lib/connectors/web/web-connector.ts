// ============================================
// AskVault — Web URL Connector
// Fetches and extracts content from web pages
// ============================================

import type {
  KnowledgeConnector,
  ConnectorSource,
  ConnectorNotebook,
  ConnectorHealth,
} from "../base";

export class WebUrlConnector implements KnowledgeConnector {
  readonly type = "WEB_URL";
  readonly displayName = "Web Page / URL";

  async healthCheck(): Promise<ConnectorHealth> {
    return { isConnected: true, lastCheckedAt: new Date() };
  }

  async discoverNotebooks(): Promise<ConnectorNotebook[]> {
    return [];
  }

  async fetchSourceContent(url: string): Promise<ConnectorSource | null> {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "AskVault-Connector/1.0" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") ?? "";
      const html = await response.text();

      // Simple HTML text extraction (production: use @mozilla/readability)
      const rawContent = extractTextFromHtml(html);
      const title = extractTitle(html) ?? url;

      return {
        externalId: url,
        externalUrl: url,
        title,
        rawContent,
        sourceType: "webpage",
        mimeType: contentType,
      };
    } catch {
      return null;
    }
  }

  async syncNotebook(
    _externalNotebookId: string,
    _onSource: (source: ConnectorSource) => Promise<void>
  ): Promise<{ synced: number; failed: number; errors: string[] }> {
    return { synced: 0, failed: 0, errors: [] };
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, and HTML tags
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}
