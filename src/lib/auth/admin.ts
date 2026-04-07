// ============================================
// AskVault — Admin Auth Helpers (Clerk-based)
// ============================================

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";
import type { User, UserRole } from "@prisma/client";

export type AdminUser = User & { role: UserRole };

/**
 * Get the currently authenticated admin user.
 * Returns null if not authenticated or not an admin.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return null;
    if (!["SUPER_ADMIN", "TENANT_ADMIN", "TENANT_EDITOR"].includes(user.role)) {
      return null;
    }

    return user as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Require admin authentication — throws if not authorized.
 */
export async function requireAdminUser(
  allowedRoles: UserRole[] = ["SUPER_ADMIN", "TENANT_ADMIN", "TENANT_EDITOR"]
): Promise<AdminUser> {
  const user = await getAdminUser();

  if (!user) {
    throw new Error("Unauthorized: Admin authentication required");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient role");
  }

  return user;
}

/**
 * Sync a Clerk user into our database on first sign-in.
 */
export async function syncClerkUser(clerkId: string): Promise<User> {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("No Clerk user found");

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();
  const avatarUrl = clerkUser.imageUrl;

  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (existingUser) {
    return prisma.user.update({
      where: { clerkId },
      data: { email, name, avatarUrl, lastSeenAt: new Date() },
    });
  }

  // New user — check if they're the first (make them SUPER_ADMIN)
  const userCount = await prisma.user.count({
    where: { role: { in: ["SUPER_ADMIN"] } },
  });

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      avatarUrl,
      role: userCount === 0 ? "SUPER_ADMIN" : "END_USER",
      lastSeenAt: new Date(),
    },
  });
}
