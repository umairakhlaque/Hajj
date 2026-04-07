// ============================================
// AskVault — Tenant End-User Session
// Handles anonymous, password, and OTP modes
// ============================================

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { generateSecureToken } from "@/lib/security/encryption";

const SESSION_COOKIE = "av_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) throw new Error("ADMIN_SECRET_KEY not set");
  return new TextEncoder().encode(secret);
}

export interface TenantSessionPayload {
  sessionId: string;
  tenantId: string;
  userId?: string;
  anonymousId?: string;
  role: string;
}

/**
 * Create a new anonymous session for a tenant chat visitor.
 */
export async function createAnonymousSession(
  tenantId: string
): Promise<string> {
  const anonymousId = generateSecureToken(16);
  const sessionToken = generateSecureToken(32);

  // Create or upsert anonymous user
  const user = await prisma.user.create({
    data: {
      tenantId,
      anonymousId,
      role: "END_USER",
      lastSeenAt: new Date(),
    },
  });

  const session = await prisma.chatSession.create({
    data: {
      tenantId,
      userId: user.id,
      sessionToken,
      scopeType: "all",
    },
  });

  const jwt = await new SignJWT({
    sessionId: session.id,
    tenantId,
    userId: user.id,
    anonymousId,
    role: "END_USER",
  } satisfies TenantSessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecret());

  return jwt;
}

/**
 * Validate a tenant session JWT and return the payload.
 */
export async function validateTenantSession(
  token: string
): Promise<TenantSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TenantSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Get current session from cookie.
 */
export async function getCurrentTenantSession(): Promise<TenantSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateTenantSession(token);
}

export { SESSION_COOKIE };
