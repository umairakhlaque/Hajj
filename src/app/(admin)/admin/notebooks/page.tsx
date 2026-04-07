// ============================================
// AskVault — Admin Notebooks Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotebookCard } from "@/components/admin/NotebookCard";
import { toast } from "sonner";

interface Notebook {
  id: string;
  displayName: string;
  description?: string;
  slug: string;
  connectorType: string;
  syncStatus: string;
  lastSyncAt?: string;
  classification: string;
  _count: { sourceRecords: number };
  googleAccountConnection?: { googleEmail: string };
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchNotebooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notebooks");
      const data = await res.json();
      if (data.success) setNotebooks(data.data);
    } catch {
      toast.error("Failed to load notebooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const handleSync = async (id: string) => {
    toast.info("Sync started...");
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "notebook", resourceId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Sync job queued");
        setTimeout(fetchNotebooks, 2000);
      } else {
        toast.error("Sync failed");
      }
    } catch {
      toast.error("Sync request failed");
    }
  };

  const filtered = notebooks.filter(
    (n) =>
      n.displayName.toLowerCase().includes(search.toLowerCase()) ||
      n.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notebooks</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage your knowledge sources
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5" />
          New Notebook
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Search notebooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-white/3 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-vault-600/10 border border-vault-500/20 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-vault-400/50" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? "No notebooks match your search" : "No notebooks yet"}
          </h3>
          <p className="text-sm text-white/30 max-w-sm">
            {search
              ? "Try a different search term"
              : "Create your first notebook to start adding knowledge sources"}
          </p>
          {!search && (
            <Button size="sm" className="mt-4">
              <Plus className="w-3.5 h-3.5" />
              Create Notebook
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((notebook, i) => (
            <NotebookCard
              key={notebook.id}
              id={notebook.id}
              displayName={notebook.displayName}
              description={notebook.description}
              slug={notebook.slug}
              connectorType={notebook.connectorType}
              syncStatus={notebook.syncStatus}
              lastSyncAt={notebook.lastSyncAt ? new Date(notebook.lastSyncAt) : null}
              classification={notebook.classification}
              sourceCount={notebook._count.sourceRecords}
              googleEmail={notebook.googleAccountConnection?.googleEmail}
              onSync={handleSync}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}
