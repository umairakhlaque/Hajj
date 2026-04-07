// ============================================
// AskVault — Audit Logging
// ============================================

import { prisma } from "@/lib/db/client";
import type { AuditAction, Prisma } from "@prisma/client";

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
    await prisma.auditLog.create({
      data: {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        ...(params.tenantId ? { tenant: { connect: { id: params.tenantId } } } : {}),
        ...(params.userId ? { user: { connect: { id: params.userId } } } : {}),
      },
    });
  } catch (error) {
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
