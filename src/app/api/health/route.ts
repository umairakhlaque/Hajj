// ============================================
// AskVault — Health Check Endpoint
// GET /api/health
// Used by Vercel, uptime monitors, Docker HEALTHCHECK
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    vectorExtension: CheckResult;
    openai: CheckResult;
    encryption: CheckResult;
  };
}

interface CheckResult {
  status: "ok" | "error" | "unconfigured";
  latencyMs?: number;
  message?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      message: process.env.NODE_ENV === "development"
        ? (err instanceof Error ? err.message : "DB error")
        : "Database unavailable",
    };
  }
}

async function checkVectorExtension(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    if (result.length === 0) {
      return { status: "error", message: "pgvector extension not installed", latencyMs: Date.now() - start };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", message: "Could not check pgvector", latencyMs: Date.now() - start };
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { status: "unconfigured", message: "OPENAI_API_KEY not set" };
  }
  // Just verify key format, don't make an actual API call on every health check
  const key = process.env.OPENAI_API_KEY;
  if (!key.startsWith("sk-")) {
    return { status: "error", message: "Invalid API key format" };
  }
  return { status: "ok" };
}

async function checkEncryption(): Promise<CheckResult> {
  try {
    const { encrypt, decrypt } = await import("@/lib/security/encryption");
    const testValue = "health-check-test-" + Date.now();
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    if (decrypted !== testValue) {
      return { status: "error", message: "Encryption round-trip failed" };
    }
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Encryption check failed",
    };
  }
}

export async function GET(request: NextRequest) {
  // Optionally require a secret for detailed health info
  const authHeader = request.headers.get("x-health-secret");
  const isAuthenticated = authHeader === process.env.CRON_SECRET;

  const [database, vectorExtension, openai, encryption] = await Promise.all([
    checkDatabase(),
    checkVectorExtension(),
    checkOpenAI(),
    checkEncryption(),
  ]);

  const allOk = [database, vectorExtension, openai, encryption].every(
    (c) => c.status === "ok" || c.status === "unconfigured"
  );
  const anyError = [database, vectorExtension, encryption].some(
    (c) => c.status === "error"
  );

  const overallStatus = anyError ? "error" : allOk ? "ok" : "degraded";
  const httpStatus = overallStatus === "error" ? 503 : 200;

  // Redact sensitive details from unauthenticated responses
  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Math.round(process.uptime()),
    checks: isAuthenticated
      ? { database, vectorExtension, openai, encryption }
      : {
          database: { status: database.status },
          vectorExtension: { status: vectorExtension.status },
          openai: { status: openai.status },
          encryption: { status: encryption.status },
        },
  };

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}
