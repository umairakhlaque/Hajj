// ============================================
// AskVault — Admin Tenants API
// GET/POST /api/admin/tenants
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiValidationError,
} from "@/lib/utils/api-response";
import { writeAuditLog, getClientIp } from "@/lib/utils/audit";

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  authMode: z
    .enum(["ANONYMOUS", "PASSWORD", "EMAIL_OTP", "GOOGLE", "CLERK"])
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminUser(["SUPER_ADMIN"]);

    const tenants = await prisma.tenant.findMany({
      include: {
        branding: true,
        _count: {
          select: {
            users: true,
            notebookRecords: true,
            chatSessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(tenants);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to fetch tenants", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminUser(["SUPER_ADMIN"]);
    const body = CreateTenantSchema.parse(await request.json());

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({
      where: { slug: body.slug },
    });
    if (existing) {
      return apiValidationError("Tenant slug already taken");
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: body.name,
        slug: body.slug,
        plan: body.plan ?? "STARTER",
        authMode: body.authMode ?? "ANONYMOUS",
        branding: {
          create: {
            heroTitle: `Ask ${body.name}`,
            heroSubtitle: "Get instant answers from our knowledge base.",
          },
        },
      },
      include: { branding: true },
    });

    await writeAuditLog({
      userId: admin.id,
      action: "TENANT_CREATED",
      resourceType: "Tenant",
      resourceId: tenant.id,
      metadata: { name: body.name, slug: body.slug },
      ipAddress: getClientIp(request),
    });

    return apiSuccess(tenant, 201, "Tenant created successfully");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err.errors[0]?.message ?? "Validation error");
    }
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return apiUnauthorized();
    }
    return apiError("Failed to create tenant", 500);
  }
}
