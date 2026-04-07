// ============================================
// AskVault — Sync Monitoring Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface SyncJob {
  id: string;
  jobType: string;
  status: string;
  resourceType?: string;
  totalItems?: number;
  processedItems: number;
  failedItems: number;
  errorMessage?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  tenant: { name: string };
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  COMPLETED: { color: "text-emerald-400", icon: CheckCircle },
  FAILED: { color: "text-red-400", icon: XCircle },
  RUNNING: { color: "text-vault-400", icon: RefreshCw },
  QUEUED: { color: "text-amber-400", icon: Clock },
  CANCELLED: { color: "text-white/30", icon: XCircle },
};

export default function SyncPage() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/admin/sync/jobs");
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sync Monitor</h1>
          <p className="text-sm text-white/40 mt-1">Track knowledge ingestion jobs</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchJobs}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCw className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No sync jobs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job, i) => {
            const cfg = statusConfig[job.status] ?? statusConfig.QUEUED;
            const StatusIcon = cfg.icon;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 rounded-2xl border border-white/8 bg-surface-700/30 hover:border-white/12 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={`w-4 h-4 flex-shrink-0 ${cfg.color} ${
                        job.status === "RUNNING" ? "animate-spin" : ""
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {job.jobType.replace(/_/g, " ")}
                        {job.resourceType && (
                          <span className="text-white/40 ml-2 text-xs">
                            ({job.resourceType})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/30">{job.tenant?.name}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      job.status === "COMPLETED"
                        ? "success"
                        : job.status === "FAILED"
                        ? "danger"
                        : job.status === "RUNNING"
                        ? "default"
                        : "warning"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>

                {job.totalItems != null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/30 mb-1">
                      <span>Progress</span>
                      <span>
                        {job.processedItems} / {job.totalItems}
                        {job.failedItems > 0 && (
                          <span className="text-red-400 ml-1">
                            ({job.failedItems} failed)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vault-600 rounded-full transition-all"
                        style={{
                          width: `${(job.processedItems / job.totalItems) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {job.errorMessage && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-300/70">{job.errorMessage}</p>
                  </div>
                )}

                <p className="text-xs text-white/20 mt-2">
                  {formatDistanceToNow(new Date(job.scheduledAt), { addSuffix: true })}
                  {job.completedAt && ` · Completed in ${
                    Math.round(
                      (new Date(job.completedAt).getTime() -
                        new Date(job.startedAt ?? job.scheduledAt).getTime()) / 1000
                    )
                  }s`}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
