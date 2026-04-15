// ============================================
// AskVault — Admin Tenants Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Users, BookOpen, MessageSquare, Globe, Lock, Key, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isActive: boolean;
  authMode: string;
  notebookLmId?: string | null;
  createdAt: string;
  _count?: { users: number; notebookRecords: number; chatSessions: number };
}

const planColors: Record<string, string> = {
  FREE: "ghost",
  STARTER: "default",
  PROFESSIONAL: "gold",
  ENTERPRISE: "success",
};

const authIcons: Record<string, typeof Globe> = {
  ANONYMOUS: Globe,
  PASSWORD: Lock,
  EMAIL_OTP: Key,
  GOOGLE: Globe,
  CLERK: Key,
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editNotebookLmId, setEditNotebookLmId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTenants(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, slug: newSlug }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Workspace created");
        setTenants((prev) => [data.data, ...prev]);
        setShowNew(false);
        setNewName("");
        setNewSlug("");
      } else {
        toast.error(data.error ?? "Failed to create workspace");
      }
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditNotebookLmId(tenant.notebookLmId ?? "");
  };

  const handleSave = async () => {
    if (!editTenant) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${editTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookLmId: editNotebookLmId.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Workspace updated");
        setTenants((prev) =>
          prev.map((t) =>
            t.id === editTenant.id
              ? { ...t, notebookLmId: editNotebookLmId.trim() || null }
              : t
          )
        );
        setEditTenant(null);
      } else {
        toast.error(data.error ?? "Failed to update workspace");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-sm text-white/40 mt-1">Manage tenants and their configurations</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="w-3.5 h-3.5" />
          New Workspace
        </Button>
      </div>

      {/* New workspace form */}
      {showNew && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 rounded-2xl border border-vault-500/30 bg-vault-500/5 space-y-3"
        >
          <p className="text-sm font-medium text-white">Create New Workspace</p>
          <div className="flex gap-3">
            <Input
              placeholder="Workspace name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
              }}
              className="flex-1"
            />
            <Input
              placeholder="slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-40"
            />
            <Button onClick={handleCreate} disabled={creating || !newName || !newSlug}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
          <p className="text-xs text-white/30">Chat URL: /t/{newSlug || "slug"}/chat</p>
        </motion.div>
      )}

      {/* Tenants grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30">No workspaces yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((tenant, i) => {
            const AuthIcon = authIcons[tenant.authMode] ?? Globe;
            return (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl border border-white/8 bg-surface-700/40 hover:border-white/15 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-vault-600/15 border border-vault-500/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-vault-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{tenant.name}</p>
                      <p className="text-xs text-white/30">/t/{tenant.slug}/chat</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={(planColors[tenant.plan] ?? "ghost") as never} className="text-[10px]">
                      {tenant.plan}
                    </Badge>
                    <Badge variant={tenant.isActive ? "success" : "danger"} className="text-[10px]">
                      {tenant.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <button
                      onClick={() => openEdit(tenant)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Users, value: tenant._count?.users ?? 0, label: "Users" },
                    { icon: BookOpen, value: tenant._count?.notebookRecords ?? 0, label: "Notebooks" },
                    { icon: MessageSquare, value: tenant._count?.chatSessions ?? 0, label: "Chats" },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="text-center p-2 rounded-xl bg-white/3">
                      <p className="text-base font-bold text-white">{value}</p>
                      <p className="text-[10px] text-white/30">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-white/25">
                  <div className="flex items-center gap-1">
                    <AuthIcon className="w-3 h-3" />
                    {tenant.authMode}
                  </div>
                  <div className="flex items-center gap-2">
                    {tenant.notebookLmId && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">
                        NotebookLM linked
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-800 border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Workspace Settings</h2>
                <p className="text-xs text-white/40 mt-0.5">{editTenant.name}</p>
              </div>
              <button
                onClick={() => setEditTenant(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">
                  NotebookLM Notebook ID
                </label>
                <Input
                  placeholder="e.g. 4497b952-db06-48ca-a593-0c7ecae98159"
                  value={editNotebookLmId}
                  onChange={(e) => setEditNotebookLmId(e.target.value)}
                />
                <p className="text-[10px] text-white/25 mt-1.5">
                  Found in the NotebookLM URL: notebooklm.google.com/notebooklm?corpus=<strong>ID</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditTenant(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
