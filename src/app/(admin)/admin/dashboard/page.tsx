// ============================================
// AskVault — Admin Dashboard
// ============================================

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/client";
import { StatsCard } from "@/components/admin/StatsCard";
import { BookOpen, MessageSquare, Building2, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import { subDays } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect("/sign-in");

  const since7d = subDays(new Date(), 7);

  const [
    totalTenants,
    totalNotebooks,
    totalSources,
    pendingSources,
    totalChats7d,
    recentSyncJobs,
    ungoundedMessages7d,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.notebookRecord.count({ where: { isActive: true } }),
    prisma.sourceRecord.count({ where: { status: "APPROVED" } }),
    prisma.sourceRecord.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: since7d }, role: "assistant" } }),
    prisma.syncJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { tenant: { select: { name: true } } },
    }),
    prisma.chatMessage.count({ where: { createdAt: { gte: since7d }, role: "assistant", isGrounded: false } }),
  ]);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">
            Welcome back, {admin.name?.split(" ")[0] ?? "Admin"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/notebooks">
            <Button size="sm" variant="outline">
              <BookOpen className="w-3.5 h-3.5" />
              Notebooks
            </Button>
          </Link>
          <Link href="/admin/tenants">
            <Button size="sm">
              <Building2 className="w-3.5 h-3.5" />
              Workspaces
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Workspaces" value={totalTenants} icon={Building2} delay={0} />
        <StatsCard title="Active Notebooks" value={totalNotebooks} icon={BookOpen} delay={0.05} />
        <StatsCard title="Approved Sources" value={totalSources} icon={FileText} variant="success" delay={0.1} />
        <StatsCard title="Chats (7 days)" value={totalChats7d} icon={MessageSquare} variant="gold" delay={0.15} />
      </div>

      {/* Alerts */}
      {(pendingSources > 0 || ungoundedMessages7d > 0) && (
        <div className="space-y-3">
          {pendingSources > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {pendingSources} source{pendingSources > 1 ? "s" : ""} pending approval
                  </p>
                  <p className="text-xs text-white/40">Review and approve sources to make them searchable</p>
                </div>
              </div>
              <Link href="/admin/sources?status=PENDING_APPROVAL">
                <Button size="sm" variant="outline">Review</Button>
              </Link>
            </div>
          )}
          {ungoundedMessages7d > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {ungoundedMessages7d} ungrounded answer{ungoundedMessages7d > 1 ? "s" : ""} this week
                  </p>
                  <p className="text-xs text-white/40">Users asked questions not covered by your knowledge base</p>
                </div>
              </div>
              <Link href="/admin/analytics">
                <Button size="sm" variant="outline">Investigate</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent sync jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Sync Jobs</h2>
          <Link href="/admin/sync">
            <Button size="sm" variant="ghost" className="text-xs">View all</Button>
          </Link>
        </div>
        <div className="space-y-2">
          {recentSyncJobs.length === 0 ? (
            <div className="text-center py-8 rounded-2xl border border-white/5 bg-surface-700/20">
              <RefreshCw className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/30">No sync jobs yet.</p>
              <p className="text-xs text-white/20 mt-1">Add a notebook and trigger a sync to get started.</p>
            </div>
          ) : (
            recentSyncJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-700/30 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw
                    className={`w-4 h-4 ${
                      job.status === "RUNNING"
                        ? "text-vault-400 animate-spin"
                        : job.status === "COMPLETED"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-white">{job.jobType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-white/30">{job.tenant?.name}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    job.status === "COMPLETED" ? "success"
                    : job.status === "FAILED" ? "danger"
                    : job.status === "RUNNING" ? "default"
                    : "ghost"
                  }
                  className="text-[10px]"
                >
                  {job.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
