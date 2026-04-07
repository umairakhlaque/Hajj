// ============================================
// AskVault — Google Accounts Management Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Link2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Mail,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams } from "next/navigation";

interface GoogleAccount {
  id: string;
  googleEmail: string;
  displayName?: string;
  isActive: boolean;
  isRevoked: boolean;
  lastSyncAt?: string;
  lastTokenRefreshAt?: string;
  tokenRefreshFailures: number;
  scopes: string[];
  _count?: { notebookRecords: number };
}

export default function GoogleAccountsPage() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const email = searchParams.get("email");

  useEffect(() => {
    if (success) toast.success(`Google account connected: ${email}`);
    if (error) toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
  }, [success, error, email]);

  useEffect(() => {
    fetch("/api/admin/google-accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAccounts(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = () => {
    // Get first tenant — in production, allow tenant selection
    window.location.href = "/api/google/connect?tenantId=default";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Google Accounts</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage connected Google accounts for knowledge sync
          </p>
        </div>
        <Button size="sm" onClick={handleConnect}>
          <Plus className="w-3.5 h-3.5" />
          Connect Account
        </Button>
      </div>

      {/* Info card */}
      <div className="p-4 rounded-xl border border-vault-500/20 bg-vault-500/5">
        <p className="text-sm text-vault-300">
          Connected Google accounts are used to sync content from Google Drive, Docs, and Slides into your knowledge base.
          Tokens are encrypted at rest using AES-256-GCM and never exposed to end users.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-vault-600/10 border border-vault-500/20 flex items-center justify-center mb-4">
            <Link2 className="w-8 h-8 text-vault-400/50" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No Google accounts connected
          </h3>
          <p className="text-sm text-white/30 max-w-sm mb-4">
            Connect a Google account to start syncing content from Google Drive and Docs
          </p>
          <Button onClick={handleConnect}>
            <Link2 className="w-3.5 h-3.5" />
            Connect Google Account
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, delay }: { account: GoogleAccount; delay: number }) {
  const statusIcon = account.isRevoked
    ? XCircle
    : account.tokenRefreshFailures > 0
    ? AlertTriangle
    : CheckCircle;

  const statusColor = account.isRevoked
    ? "text-red-400"
    : account.tokenRefreshFailures > 0
    ? "text-amber-400"
    : "text-emerald-400";

  const StatusIcon = statusIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between p-4 rounded-2xl border border-white/8 bg-surface-700/40 hover:border-white/15 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-white/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{account.googleEmail}</p>
          {account.displayName && (
            <p className="text-xs text-white/40">{account.displayName}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <div className={`flex items-center gap-1 text-xs ${statusColor}`}>
              <StatusIcon className="w-3 h-3" />
              {account.isRevoked
                ? "Revoked"
                : account.tokenRefreshFailures > 0
                ? `${account.tokenRefreshFailures} refresh failures`
                : "Connected"}
            </div>
            {account.lastSyncAt && (
              <div className="flex items-center gap-1 text-xs text-white/30">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={account.isRevoked ? "danger" : account.isActive ? "success" : "warning"}>
          {account.isRevoked ? "Revoked" : account.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button size="icon-sm" variant="ghost" title="Refresh token">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
