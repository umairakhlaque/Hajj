// ============================================
// AskVault — Chat API Route
// POST /api/chat
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { generateGroundedAnswer } from "@/lib/ai/chat-engine";
import { generateGeminiAnswer } from "@/lib/ai/gemini-engine";
import { askNotebookLM } from "@/lib/ai/notebooklm-engine";
import {
  apiSuccess,
  apiError,
  apiRateLimited,
  apiValidationError,
} from "@/lib/utils/api-response";
import {
  checkRateLimit,
  CHAT_RATE_LIMIT,
} from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/utils/audit";
import { validateTenantSession } from "@/lib/auth/tenant-session";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/tenant-session";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  tenantSlug: z.string(),
  sessionId: z.string().nullish(),
  scopeType: z.enum(["all", "notebook", "collection"]).optional().default("all"),
  scopeId: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limiting by IP
  const rateResult = checkRateLimit(`chat:${ip}`, CHAT_RATE_LIMIT);
  if (!rateResult.allowed) {
    return apiRateLimited(rateResult.resetAt);
  }

  // Parse request
  let body: z.infer<typeof ChatRequestSchema>;
  try {
    const raw = await request.json();
    body = ChatRequestSchema.parse(raw);
  } catch (err) {
    return apiValidationError(
      err instanceof z.ZodError
        ? err.issues?.[0]?.message ?? "Invalid request"
        : "Invalid JSON"
    );
  }

  // Resolve tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: body.tenantSlug, isActive: true },
    include: { branding: true },
  });

  if (!tenant) {
    return apiError("Tenant not found", 404);
  }

  // Validate session for non-anonymous tenants
  let chatSession = null;
  if (tenant.authMode !== "ANONYMOUS") {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return apiError("Authentication required", 401);
    }
    const sessionPayload = await validateTenantSession(sessionToken);
    if (!sessionPayload || sessionPayload.tenantId !== tenant.id) {
      return apiError("Invalid session", 401);
    }
  }

  // Get or create chat session
  if (body.sessionId) {
    chatSession = await prisma.chatSession.findUnique({
      where: { id: body.sessionId, tenantId: tenant.id },
    });
  }

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        tenantId: tenant.id,
        scopeType: body.scopeType,
        scopeId: body.scopeId,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });
  }

  // Store user message
  const userMessage = await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: "user",
      content: body.message,
    },
  });

  try {
    const notebookLmId = tenant.notebookLmId ?? null;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const useNotebookLM = !!notebookLmId && (!!process.env.NOTEBOOKLM_COOKIES || !!process.env.NOTEBOOKLM_SESSION_FILE);

    const geminiOptions = {
      tenantId: tenant.id,
      notebookId: body.scopeType === "notebook" ? body.scopeId : undefined,
      conversationHistory: body.conversationHistory,
      strictGroundedMode: tenant.strictGroundedMode,
      systemPromptOverride: tenant.systemPromptOverride,
    };

    let result;
    if (useNotebookLM) {
      try {
        result = await askNotebookLM(body.message, {
          notebookId: notebookLmId!,
          sessionId: chatSession.id,
          conversationHistory: body.conversationHistory,
          systemPromptOverride: tenant.systemPromptOverride,
        });
      } catch (nlmError) {
        // NotebookLM failed — fall back to Gemini or DeepSeek
        console.warn("[Chat] NotebookLM unavailable, falling back:", (nlmError as Error).message?.slice(0, 80));
        result = hasGemini
          ? await generateGeminiAnswer(body.message, geminiOptions)
          : await generateGroundedAnswer(body.message, {
              retrieval: { tenantId: tenant.id, query: body.message, scopeType: body.scopeType, scopeId: body.scopeId, allowedClassifications: ["PUBLIC", "TENANT_VISIBLE", "INTERNAL"] },
              conversationHistory: body.conversationHistory,
              strictGroundedMode: tenant.strictGroundedMode,
              systemPromptOverride: tenant.systemPromptOverride,
            });
      }
    } else if (hasGemini) {
      result = await generateGeminiAnswer(body.message, geminiOptions);
    } else {
      result = await generateGroundedAnswer(body.message, {
        retrieval: { tenantId: tenant.id, query: body.message, scopeType: body.scopeType, scopeId: body.scopeId, allowedClassifications: ["PUBLIC", "TENANT_VISIBLE", "INTERNAL"] },
        conversationHistory: body.conversationHistory,
        strictGroundedMode: tenant.strictGroundedMode,
        systemPromptOverride: tenant.systemPromptOverride,
      });
    }

    // Store assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: "assistant",
        content: result.answer,
        retrievedChunks: "retrievedChunks" in result
          ? (result.retrievedChunks as { chunkId: string; score: number; notebookName: string; sourceTitle: string; sectionHeading?: string }[]).map((c) => ({
              chunkId: c.chunkId,
              score: c.score,
              notebookName: c.notebookName,
              sourceTitle: c.sourceTitle,
              sectionHeading: c.sectionHeading,
            }))
          : [],
        confidenceScore: "confidenceScore" in result ? result.confidenceScore as number : 1.0,
        isGrounded: result.isGrounded,
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        wasInjectionAttempt: result.injectionDetected,
      },
    });

    // Prepare citations for response (respecting tenant settings)
    const citations =
      tenant.showCitations && result.isGrounded ? result.citations : [];

    return apiSuccess({
      answer: result.answer,
      sessionId: chatSession.id,
      messageId: assistantMessage.id,
      isGrounded: result.isGrounded,
      confidenceScore: "confidenceScore" in result ? result.confidenceScore as number : 1.0,
      citations: citations.map((c) => ({
        notebookName: c.notebookName,
        sourceTitle: tenant.showCitations ? c.sourceTitle : undefined,
        sectionHeading: "sectionHeading" in c ? c.sectionHeading : undefined,
      })),
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    const errMsg = (error as Error)?.message ?? String(error);
    console.error("[Chat API] Generation error:", errMsg);

    // Return 200 with the error text so the frontend displays it in the chat bubble
    const displayMsg = `DEBUG: ${errMsg}`;

    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: "assistant",
        content: displayMsg,
        isGrounded: false,
      },
    });

    return apiSuccess({
      answer: displayMsg,
      sessionId: chatSession.id,
      messageId: "error",
      isGrounded: false,
      confidenceScore: 0,
      citations: [],
      latencyMs: 0,
    });

  }
}
