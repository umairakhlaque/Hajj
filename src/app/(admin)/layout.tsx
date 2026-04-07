// ============================================
// AskVault — Admin Layout
// ============================================

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
