// ============================================
// AskVault — Sources Management Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams } from "next/navigation";

interface Source {
  id: string;
  title: string;
  description?: string;
  connectorType: string;
  status: string;
  classification: string;
  wordCount?: number;
  createdAt: string;
  _count: { chunks: number };
}

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; badge: string }> = {
  APPROVED: { icon: CheckCircle, label: "Approved", badge: "success" },
  REJECTED: { icon: XCircle, label: "Rejected", badge: "danger" },
  DRAFT: { icon: Clock, label: "Draft", badge: "ghost" },
  PENDING_APPROVAL: { icon: AlertTriangle, label: "Pending", badge: "warning" },
  ARCHIVED: { icon: XCircle, label: "Archived", badge: "ghost" },
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status") ?? "";
    setStatusFilter(status);
  }, [searchParams]);

  const fetchSources = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/admin/sources?${params}`);
      const data = await res.json();
      if (data.success) setSources(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [statusFilter]);

  const handleApprove = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/admin/sources/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === "approve" ? "Source approved and ingestion started" : "Source rejected");
        fetchSources();
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const handleSync = async (id: string) => {
    try {
      await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "source", resourceId: id }),
      });
      toast.success("Re-indexing started");
    } catch {
      toast.error("Failed to trigger sync");
    }
  };

  const filtered = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sources</h1>
          <p className="text-sm text-white/40 mt-1">
            Review and manage knowledge content
          </p>
        </div>
        <Button size="sm">
          <FileText className="w-3.5 h-3.5" />
          Add Source
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {["", "PENDING_APPROVAL", "APPROVED", "REJECTED", "DRAFT"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-xl transition-all ${
                statusFilter === status
                  ? "bg-vault-600/30 text-vault-300 border border-vault-500/40"
                  : "bg-white/5 text-white/40 border border-white/8 hover:bg-white/10"
              }`}
            >
              {status || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Sources list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No sources found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((source, i) => {
            const cfg = statusConfig[source.status] ?? statusConfig.DRAFT;
            const StatusIcon = cfg.icon;

            return (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-surface-700/30 hover:border-white/15 transition-all group"
              >
                <StatusIcon
                  className={`w-4 h-4 flex-shrink-0 ${
                    source.status === "APPROVED"
                      ? "text-emerald-400"
                      : source.status === "PENDING_APPROVAL"
                      ? "text-amber-400"
                      : source.status === "REJECTED"
                      ? "text-red-400"
                      : "text-white/20"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {source.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-white/30">
                      {source.connectorType.replace(/_/g, " ")}
                    </span>
                    {source.wordCount && (
                      <span className="text-xs text-white/20">
                        {source.wordCount.toLocaleString()} words
                      </span>
                    )}
                    <span className="text-xs text-white/20">
                      {source._count.chunks} chunks
                    </span>
                    <span className="text-xs text-white/20">
                      {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {source.status === "PENDING_APPROVAL" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handleApprove(source.id, "approve")}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleApprove(source.id, "reject")}
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </Button>
                    </>
                  )}
                  {source.status === "APPROVED" && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleSync(source.id)}
                      title="Re-index"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <Badge variant={cfg.badge as never}>{cfg.label}</Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
