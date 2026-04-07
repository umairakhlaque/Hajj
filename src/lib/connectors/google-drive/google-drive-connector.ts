// ============================================
// AskVault — Google Drive / Docs Connector
// Mode B: Content synced from Google Workspace
// ============================================

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { decrypt } from "@/lib/security/encryption";
import type {
  KnowledgeConnector,
  ConnectorSource,
  ConnectorNotebook,
  ConnectorHealth,
} from "../base";

interface GoogleAccountTokens {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiresAt?: Date | null;
}

export class GoogleDriveConnector implements KnowledgeConnector {
  readonly type = "GOOGLE_DRIVE";
  readonly displayName = "Google Drive / Docs";

  private oauth2Client: OAuth2Client;

  constructor(tokens: GoogleAccountTokens) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Decrypt and set tokens
    this.oauth2Client.setCredentials({
      access_token: decrypt(tokens.encryptedAccessToken),
      refresh_token: decrypt(tokens.encryptedRefreshToken),
      expiry_date: tokens.tokenExpiresAt?.getTime(),
    });
  }

  async healthCheck(): Promise<ConnectorHealth> {
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      return {
        isConnected: true,
        accountEmail: userInfo.data.email ?? undefined,
        lastCheckedAt: new Date(),
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : "Connection failed",
        lastCheckedAt: new Date(),
      };
    }
  }

  async discoverNotebooks(): Promise<ConnectorNotebook[]> {
    // We map Google Drive folders as "notebooks"
    try {
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id, name, description)",
        pageSize: 50,
      });

      return (res.data.files ?? []).map((folder) => ({
        externalId: folder.id!,
        displayName: folder.name ?? "Untitled Folder",
        description: folder.description ?? undefined,
        sources: [],
      }));
    } catch {
      return [];
    }
  }

  async fetchSourceContent(externalId: string): Promise<ConnectorSource | null> {
    try {
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });
      const docs = google.docs({ version: "v1", auth: this.oauth2Client });

      // Get file metadata
      const fileMeta = await drive.files.get({
        fileId: externalId,
        fields: "id, name, mimeType, description, createdTime, modifiedTime, owners",
      });

      const file = fileMeta.data;
      let rawContent = "";
      let sourceType = "gdrive";

      if (file.mimeType === "application/vnd.google-apps.document") {
        // Export Google Doc as plain text
        const doc = await docs.documents.get({ documentId: externalId });
        rawContent = extractDocText(doc.data);
        sourceType = "gdoc";
      } else if (
        file.mimeType === "application/vnd.google-apps.presentation"
      ) {
        // Export Slides as plain text
        const slides = google.slides({ version: "v1", auth: this.oauth2Client });
        const presentation = await slides.presentations.get({
          presentationId: externalId,
        });
        rawContent = extractSlidesText(presentation.data);
        sourceType = "gslides";
      } else {
        // Binary file — export as plain text if possible
        const exportRes = await drive.files.export(
          { fileId: externalId, mimeType: "text/plain" },
          { responseType: "text" }
        );
        rawContent = exportRes.data as string;
        sourceType = "gdrive";
      }

      return {
        externalId,
        title: file.name ?? "Untitled",
        description: file.description ?? undefined,
        mimeType: file.mimeType ?? undefined,
        rawContent,
        sourceType,
        author: file.owners?.[0]?.displayName ?? undefined,
        publishedAt: file.createdTime ? new Date(file.createdTime) : undefined,
      };
    } catch (error) {
      console.error("[GoogleDriveConnector] fetchSourceContent error:", error);
      return null;
    }
  }

  async syncNotebook(
    externalNotebookId: string, // Folder ID
    onSource: (source: ConnectorSource) => Promise<void>
  ): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const drive = google.drive({ version: "v3", auth: this.oauth2Client });
      const res = await drive.files.list({
        q: `'${externalNotebookId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType)",
        pageSize: 100,
      });

      const files = res.data.files ?? [];

      for (const file of files) {
        try {
          const source = await this.fetchSourceContent(file.id!);
          if (source) {
            await onSource(source);
            synced++;
          }
        } catch (err) {
          failed++;
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    } catch (err) {
      errors.push(`Folder sync failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    return { synced, failed, errors };
  }

  /**
   * Refresh the access token and return new encrypted tokens.
   */
  async refreshTokens(): Promise<{
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiresAt: Date;
  }> {
    const { encrypt } = await import("@/lib/security/encryption");
    const response = await this.oauth2Client.refreshAccessToken();
    const creds = response.credentials;

    return {
      encryptedAccessToken: encrypt(creds.access_token!),
      encryptedRefreshToken: encrypt(creds.refresh_token!),
      tokenExpiresAt: new Date(creds.expiry_date!),
    };
  }
}

// ---- Helpers ----

function extractDocText(doc: import("googleapis").docs_v1.Schema$Document): string {
  const parts: string[] = [];
  for (const element of doc.body?.content ?? []) {
    if (element.paragraph) {
      const text = element.paragraph.elements
        ?.map((e) => e.textRun?.content ?? "")
        .join("");
      if (text?.trim()) parts.push(text.trim());
    } else if (element.table) {
      for (const row of element.table.tableRows ?? []) {
        const cells = row.tableCells
          ?.map((cell) =>
            cell.content
              ?.map((c) =>
                c.paragraph?.elements?.map((e) => e.textRun?.content ?? "").join("") ?? ""
              )
              .join(" ") ?? ""
          )
          .join(" | ");
        if (cells) parts.push(cells);
      }
    }
  }
  return parts.join("\n\n");
}

function extractSlidesText(
  presentation: import("googleapis").slides_v1.Schema$Presentation
): string {
  const parts: string[] = [];
  for (const slide of presentation.slides ?? []) {
    for (const element of slide.pageElements ?? []) {
      const text = element.shape?.text?.textElements
        ?.map((te) => te.textRun?.content ?? "")
        .join("");
      if (text?.trim()) parts.push(text.trim());
    }
  }
  return parts.join("\n\n");
}
