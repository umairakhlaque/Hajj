// ============================================
// AskVault — Clerk Webhook Handler
// POST /api/webhooks/clerk
// Syncs Clerk user events to our database
// ============================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return apiError("Missing webhook headers", 400);
  }

  // In production: verify with svix library
  // const wh = new Webhook(process.env.WEBHOOK_SECRET!);
  // const payload = wh.verify(rawBody, headers);

  try {
    const payload = await request.json();
    const { type, data } = payload;

    switch (type) {
      case "user.created":
      case "user.updated": {
        const { id: clerkId, email_addresses, first_name, last_name, image_url } = data;
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(" ");

        await prisma.user.upsert({
          where: { clerkId },
          create: {
            clerkId,
            email,
            name,
            avatarUrl: image_url,
            role: "END_USER",
          },
          update: {
            email,
            name,
            avatarUrl: image_url,
          },
        });
        break;
      }

      case "user.deleted": {
        const { id: clerkId } = data;
        await prisma.user.deleteMany({ where: { clerkId } });
        break;
      }
    }

    return apiSuccess({ processed: true });
  } catch (err) {
    console.error("[Clerk Webhook] Error:", err);
    return apiError("Webhook processing failed", 500);
  }
}
