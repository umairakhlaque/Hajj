// ============================================
// AskVault — Notebook-Specific Chat Page
// /t/[tenantSlug]/notebooks/[notebookSlug]/chat
// ============================================

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ tenantSlug: string; notebookSlug: string }>;
}

export default async function NotebookChatPage({ params }: Props) {
  const { tenantSlug, notebookSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { branding: true },
  });
  if (!tenant) notFound();

  const notebook = await prisma.notebookRecord.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: notebookSlug } },
  });
  if (!notebook || !notebook.isActive) notFound();

  return (
    <div className="flex flex-col h-screen bg-gradient-vault">
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/8 bg-surface-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-vault-600 to-vault-800 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-white/40">{tenant.name}</span>
          </div>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-vault-400" />
            <span className="text-sm font-medium text-white">{notebook.displayName}</span>
          </div>
        </div>
        <Link
          href={`/t/${tenantSlug}/chat`}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          All notebooks →
        </Link>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatContainer
          tenantSlug={tenantSlug}
          notebookId={notebook.id}
          suggestedPrompts={tenant.branding?.suggestedPrompts ?? []}
          showCitations={tenant.showCitations}
          heroTitle={`Ask ${notebook.displayName}`}
          heroSubtitle={
            notebook.description ??
            `Ask questions about ${notebook.displayName}.`
          }
        />
      </div>
    </div>
  );
}
