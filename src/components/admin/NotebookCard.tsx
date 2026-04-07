"use client";

import { motion } from "framer-motion";
import { BookOpen, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, MoreVertical, Plug } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface NotebookCardProps {
  id: string;
  displayName: string;
  description?: string;
  slug: string;
  connectorType: string;
  syncStatus: string;
  lastSyncAt?: Date | null;
  classification: string;
  sourceCount: number;
  googleEmail?: string;
  onSync?: (id: string) => void;
  onEdit?: (id: string) => void;
  delay?: number;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  SUCCESS: { icon: CheckCircle, color: "text-emerald-400", label: "Synced" },
  FAILED: { icon: XCircle, color: "text-red-400", label: "Failed" },
  RUNNING: { icon: RefreshCw, color: "text-vault-400", label: "Syncing..." },
  PENDING: { icon: Clock, color: "text-amber-400", label: "Pending" },
  IDLE: { icon: Clock, color: "text-white/30", label: "Not synced" },
  PARTIAL: { icon: AlertTriangle, color: "text-amber-400", label: "Partial" },
};

const classificationColors: Record<string, string> = {
  PRIVATE: "danger",
  INTERNAL: "warning",
  TENANT_VISIBLE: "default",
  PUBLIC: "success",
} as const;

export function NotebookCard({
  id,
  displayName,
  description,
  connectorType,
  syncStatus,
  lastSyncAt,
  classification,
  sourceCount,
  googleEmail,
  onSync,
  onEdit,
  delay = 0,
}: NotebookCardProps) {
  const status = statusConfig[syncStatus] ?? statusConfig.IDLE;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="group rounded-2xl border border-white/8 bg-surface-700/50 p-5 hover:border-white/15 hover:bg-surface-600/50 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vault-600/15 border border-vault-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-vault-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{displayName}</h3>
            {googleEmail && (
              <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                <Plug className="w-2.5 h-2.5" />
                {googleEmail}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSync && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onSync(id)}
              title="Sync now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(id)}
              title="Edit"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-white/40 mb-3 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={(classificationColors[classification] ?? "ghost") as never} className="text-[10px]">
            {classification}
          </Badge>
          <span className="text-xs text-white/30">{connectorType.replace(/_/g, " ")}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{sourceCount} sources</span>
          <div className={cn("flex items-center gap-1 text-xs", status.color)}>
            <StatusIcon className={cn("w-3 h-3", syncStatus === "RUNNING" && "animate-spin")} />
            <span>{status.label}</span>
          </div>
        </div>
      </div>

      {lastSyncAt && (
        <p className="text-xs text-white/20 mt-2">
          Last sync {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
        </p>
      )}
    </motion.div>
  );
}
