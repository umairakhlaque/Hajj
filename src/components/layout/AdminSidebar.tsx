"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  FileText,
  RefreshCw,
  BarChart3,
  Settings,
  Users,
  Link2,
  ChevronRight,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  {
    section: "Overview",
    items: [
      { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    section: "Knowledge",
    items: [
      { href: "/admin/notebooks", icon: BookOpen, label: "Notebooks" },
      { href: "/admin/sources", icon: FileText, label: "Sources" },
      { href: "/admin/sync", icon: RefreshCw, label: "Sync Status" },
    ],
  },
  {
    section: "Access",
    items: [
      { href: "/admin/tenants", icon: Building2, label: "Workspaces" },
      { href: "/admin/users", icon: Users, label: "Users" },
      { href: "/admin/google-accounts", icon: Link2, label: "Google Accounts" },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-surface-800 border-r border-white/8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vault-600 to-vault-800 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AskVault</p>
          <p className="text-xs text-white/30">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navItems.map((section) => (
          <div key={section.section}>
            <p className="text-xs font-medium text-white/25 uppercase tracking-widest px-2 mb-2">
              {section.section}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 group relative",
                        isActive
                          ? "bg-vault-600/20 text-vault-300 font-medium"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-vault-600/15 rounded-xl border border-vault-500/20"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "w-4 h-4 relative z-10 flex-shrink-0",
                          isActive ? "text-vault-400" : "text-white/30 group-hover:text-white/60"
                        )}
                      />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 ml-auto relative z-10 text-vault-400" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">Secure Admin Mode</p>
        </div>
      </div>
    </aside>
  );
}
