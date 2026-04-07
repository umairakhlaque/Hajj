// ============================================
// AskVault — Tenant Chat Page
// /t/[tenantSlug]/chat
// ============================================

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { Sparkles } from "lucide-react";

interface TenantChatPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: TenantChatPageProps) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { branding: true },
  });

  if (!tenant) return { title: "Not Found" };

  return {
    title: tenant.branding?.heroTitle ?? tenant.name,
    description: tenant.branding?.heroSubtitle ?? `Chat with ${tenant.name}'s knowledge base`,
  };
}

export default async function TenantChatPage({ params }: TenantChatPageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { branding: true },
  });

  if (!tenant) notFound();

  return (
    <div className="flex flex-col h-screen bg-gradient-vault">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/8 bg-surface-800/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          {tenant.branding?.logoUrl ? (
            <img
              src={tenant.branding.logoUrl}
              alt={tenant.name}
              className="h-7 w-auto"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-vault-600 to-vault-800 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="font-semibold text-sm text-white">{tenant.name}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-300">Knowledge Active</span>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer
          tenantSlug={tenantSlug}
          suggestedPrompts={tenant.branding?.suggestedPrompts ?? []}
          showCitations={tenant.showCitations}
          heroTitle={tenant.branding?.heroTitle ?? "Ask My Knowledge Base"}
          heroSubtitle={
            tenant.branding?.heroSubtitle ??
            "Get instant, grounded answers from your private knowledge vault."
          }
        />
      </div>
    </div>
  );
}
