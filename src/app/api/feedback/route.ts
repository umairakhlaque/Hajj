// ============================================
// AskVault — Feedback API
// POST /api/feedback
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError, apiValidationError } from "@/lib/utils/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/utils/audit";

const FeedbackSchema = z.object({
  chatMessageId: z.string(),
  type: z.enum(["THUMBS_UP", "THUMBS_DOWN", "REPORT_INCORRECT", "REPORT_HARMFUL"]),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateResult = checkRateLimit(`feedback:${ip}`, 30);
  if (!rateResult.allowed) {
    return apiError("Too many feedback submissions", 429);
  }

  try {
    const body = FeedbackSchema.parse(await request.json());

    const message = await prisma.chatMessage.findUnique({
      where: { id: body.chatMessageId },
    });
    if (!message) return apiError("Message not found", 404);

    // Upsert feedback (one per message)
    const feedback = await prisma.feedback.upsert({
      where: { chatMessageId: body.chatMessageId },
      create: {
        chatMessageId: body.chatMessageId,
        type: body.type,
        comment: body.comment,
      },
      update: {
        type: body.type,
        comment: body.comment,
      },
    });

    return apiSuccess({ id: feedback.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.issues?.[0]?.message ?? "Invalid feedback");
    }
    return apiError("Failed to submit feedback", 500);
  }
}
