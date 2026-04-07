// ============================================
// AskVault — Google OAuth Flow
// Multi-account connection handler
// ============================================

import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db/client";
import { encrypt } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/utils/audit";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/presentations.readonly",
];

function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate the Google OAuth authorization URL.
 * @param state - Encoded state containing tenantId and adminUserId
 */
export function generateAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent", // Always request consent to ensure refresh_token
    state,
  });
}

/**
 * Exchange the OAuth code for tokens and store the account connection.
 */
export async function handleOAuthCallback(params: {
  code: string;
  tenantId: string;
  connectedByUserId: string;
  ipAddress?: string;
}): Promise<{ success: boolean; googleEmail?: string; error?: string }> {
  const { code, tenantId, connectedByUserId, ipAddress } = params;

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return { success: false, error: "Incomplete tokens received from Google" };
    }

    // Get user info
    client.setCredentials(tokens);
    const { google } = await import("googleapis");
    const oauth2Api = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2Api.userinfo.get();

    const googleEmail = userInfo.data.email;
    const displayName = userInfo.data.name;
    const avatarUrl = userInfo.data.picture;

    if (!googleEmail) {
      return { success: false, error: "Could not retrieve Google email" };
    }

    // Encrypt tokens before storage
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);
    const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

    // Upsert the Google account connection
    const connection = await prisma.googleAccountConnection.upsert({
      where: { tenantId_googleEmail: { tenantId, googleEmail } },
      create: {
        tenantId,
        connectedById: connectedByUserId,
        googleEmail,
        displayName,
        avatarUrl,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: GOOGLE_SCOPES,
        isActive: true,
        isRevoked: false,
      },
      update: {
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes: GOOGLE_SCOPES,
        isActive: true,
        isRevoked: false,
        tokenRefreshFailures: 0,
        displayName,
        avatarUrl,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: connectedByUserId,
      action: "GOOGLE_ACCOUNT_CONNECTED",
      resourceType: "GoogleAccountConnection",
      resourceId: connection.id,
      metadata: { googleEmail },
      ipAddress,
    });

    return { success: true, googleEmail };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed";
    return { success: false, error: message };
  }
}

/**
 * Refresh a Google account's access token.
 * Returns updated encrypted tokens or marks the account as revoked.
 */
export async function refreshGoogleToken(connectionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const connection = await prisma.googleAccountConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) return { success: false, error: "Connection not found" };

  try {
    const { decrypt } = await import("@/lib/security/encryption");
    const client = getOAuth2Client();
    client.setCredentials({
      refresh_token: decrypt(connection.encryptedRefreshToken),
    });

    const { credentials } = await client.refreshAccessToken();

    await prisma.googleAccountConnection.update({
      where: { id: connectionId },
      data: {
        encryptedAccessToken: encrypt(credentials.access_token!),
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        tokenRefreshFailures: 0,
        lastTokenRefreshAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    const failures = connection.tokenRefreshFailures + 1;
    const shouldRevoke = failures >= 3;

    await prisma.googleAccountConnection.update({
      where: { id: connectionId },
      data: {
        tokenRefreshFailures: failures,
        isRevoked: shouldRevoke,
        isActive: shouldRevoke ? false : connection.isActive,
      },
    });

    return {
      success: false,
      error: `Token refresh failed (attempt ${failures}): ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}
