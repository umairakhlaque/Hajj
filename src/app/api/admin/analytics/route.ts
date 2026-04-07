// ============================================
// AskVault — Analytics API
// GET /api/admin/analytics
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/api-response";
import { subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? admin.tenantId;
    const days = parseInt(searchParams.get("days") ?? "30");

    if (!tenantId) return apiError("tenantId required", 400);

    const since = subDays(new Date(), days);

    const [
      totalSessions,
      totalMessages,
      groundedMessages,
      feedbackStats,
      recentMessages,
      syncJobs,
    ] = await Promise.all([
      prisma.chatSession.count({ where: { tenantId, createdAt: { gte: since } } }),
      prisma.chatMessage.count({
        where: {
          chatSession: { tenantId },
          createdAt: { gte: since },
          role: "assistant",
        },
      }),
      prisma.chatMessage.count({
        where: {
          chatSession: { tenantId },
          createdAt: { gte: since },
          role: "assistant",
          isGrounded: true,
        },
      }),
      prisma.feedback.groupBy({
        by: ["type"],
        where: {
          chatMessage: { chatSession: { tenantId }, createdAt: { gte: since } },
        },
        _count: { type: true },
      }),
      prisma.chatMessage.findMany({
        where: {
          chatSession: { tenantId },
          role: "user",
          createdAt: { gte: since },
        },
        select: { content: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.syncJob.findMany({
        where: { tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const thumbsUp =
      feedbackStats.find((f) => f.type === "THUMBS_UP")?._count.type ?? 0;
    const thumbsDown =
      feedbackStats.find((f) => f.type === "THUMBS_DOWN")?._count.type ?? 0;
    const reports =
      feedbackStats.find((f) => f.type === "REPORT_INCORRECT")?._count.type ?? 0;

    // Find top questions (simple frequency count)
    const queryCounts: Record<string, number> = {};
    for (const msg of recentMessages) {
      const normalized = msg.content.toLowerCase().slice(0, 100);
      queryCounts[normalized] = (queryCounts[normalized] ?? 0) + 1;
    }
    const topQueries = Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return apiSuccess({
      period: { days, since },
      overview: {
        totalSessions,
        totalMessages,
        groundedRate:
          totalMessages > 0
            ? Math.round((groundedMessages / totalMessages) * 100)
            : 0,
        thumbsUp,
        thumbsDown,
        reports,
        satisfactionRate:
          thumbsUp + thumbsDown > 0
            ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100)
            : null,
      },
      topQueries,
      recentSyncJobs: syncJobs,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to load analytics", 500);
  }
}
