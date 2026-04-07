// ============================================
// AskVault — Audit Logging
// ============================================

import { prisma } from "@/lib/db/client";
import type { AuditAction } from "@prisma/client";

export interface AuditLogParams {
  tenantId?: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. Fire-and-forget — does not throw.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (error) {
    // Log to stderr but don't crash the request
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}

/**
 * Extract IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
