// ============================================
// AskVault — Admin Layout
// ============================================

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAdminUser, syncClerkUser } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Auto-sync Clerk user into our database on every admin visit
  try {
    await syncClerkUser(userId);
  } catch {
    // ignore sync errors — getAdminUser will handle auth check
  }

  const admin = await getAdminUser();
  if (!admin) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
