// ============================================
// AskVault — Admin Users Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt?: string;
  tenant?: { name: string };
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "gold",
  TENANT_ADMIN: "default",
  TENANT_EDITOR: "default",
  TENANT_VIEWER: "ghost",
  END_USER: "ghost",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40 mt-1">Admin and end-user accounts</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-surface-700/30 hover:border-white/15 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-vault-600/15 border border-vault-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-vault-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name ?? user.email ?? "Anonymous"}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {user.email && <p className="text-xs text-white/30 truncate">{user.email}</p>}
                  {user.tenant && <p className="text-xs text-white/20">{user.tenant.name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {user.lastSeenAt && (
                  <div className="flex items-center gap-1 text-xs text-white/20">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })}
                  </div>
                )}
                <Badge variant={(roleColors[user.role] ?? "ghost") as never} className="text-[10px]">
                  {user.role.replace(/_/g, " ")}
                </Badge>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
