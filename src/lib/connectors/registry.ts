// ============================================
// AskVault — Connector Registry
// Factory for instantiating the right connector
// ============================================

import type { ConnectorType } from "@prisma/client";
import type { KnowledgeConnector } from "./base";
import { ManualUploadConnector } from "./manual/manual-connector";
import { GoogleDriveConnector } from "./google-drive/google-drive-connector";
import { WebUrlConnector } from "./web/web-connector";
import { prisma } from "@/lib/db/client";

/**
 * Get a connector instance for a given notebook.
 * Handles token decryption and connector instantiation.
 */
export async function getConnectorForNotebook(
  notebookRecordId: string
): Promise<KnowledgeConnector> {
  const notebook = await prisma.notebookRecord.findUnique({
    where: { id: notebookRecordId },
    include: { googleAccountConnection: true },
  });

  if (!notebook) throw new Error(`Notebook not found: ${notebookRecordId}`);

  return getConnector(
    notebook.connectorType,
    notebook.googleAccountConnection
      ? {
          encryptedAccessToken: notebook.googleAccountConnection.encryptedAccessToken,
          encryptedRefreshToken: notebook.googleAccountConnection.encryptedRefreshToken,
          tokenExpiresAt: notebook.googleAccountConnection.tokenExpiresAt,
        }
      : undefined
  );
}

/**
 * Instantiate a connector by type.
 */
export function getConnector(
  type: ConnectorType,
  googleTokens?: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiresAt?: Date | null;
  }
): KnowledgeConnector {
  switch (type) {
    case "MANUAL_TEXT":
    case "MANUAL_PDF":
    case "RAW_TEXT":
      return new ManualUploadConnector();

    case "GOOGLE_DRIVE":
    case "GOOGLE_DOCS":
    case "GOOGLE_SLIDES":
      if (!googleTokens) {
        throw new Error("Google tokens required for Google connector");
      }
      return new GoogleDriveConnector(googleTokens);

    case "WEB_URL":
    case "YOUTUBE_TRANSCRIPT":
      return new WebUrlConnector();

    case "NOTEBOOKLM_ENTERPRISE":
      // Placeholder: implement when official API is available
      // Falls back to manual mode
      return new ManualUploadConnector();

    default:
      return new ManualUploadConnector();
  }
}

/**
 * List all available connector types with display info.
 */
export const CONNECTOR_REGISTRY: Array<{
  type: ConnectorType;
  displayName: string;
  description: string;
  requiresGoogle: boolean;
  icon: string;
}> = [
  {
    type: "MANUAL_TEXT",
    displayName: "Manual Text",
    description: "Paste or type content directly",
    requiresGoogle: false,
    icon: "FileText",
  },
  {
    type: "MANUAL_PDF",
    displayName: "PDF Upload",
    description: "Upload PDF documents",
    requiresGoogle: false,
    icon: "FileType",
  },
  {
    type: "GOOGLE_DOCS",
    displayName: "Google Docs",
    description: "Sync from Google Docs",
    requiresGoogle: true,
    icon: "FileEdit",
  },
  {
    type: "GOOGLE_DRIVE",
    displayName: "Google Drive",
    description: "Sync files from Google Drive",
    requiresGoogle: true,
    icon: "HardDrive",
  },
  {
    type: "GOOGLE_SLIDES",
    displayName: "Google Slides",
    description: "Sync from Google Slides presentations",
    requiresGoogle: true,
    icon: "Presentation",
  },
  {
    type: "WEB_URL",
    displayName: "Web Page",
    description: "Fetch content from a web URL",
    requiresGoogle: false,
    icon: "Globe",
  },
  {
    type: "RAW_TEXT",
    displayName: "Raw Text",
    description: "Import plain text content",
    requiresGoogle: false,
    icon: "AlignLeft",
  },
];
