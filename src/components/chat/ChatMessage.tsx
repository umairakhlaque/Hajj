"use client";

import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface Citation {
  notebookName: string;
  sourceTitle?: string;
  sectionHeading?: string;
}

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isGrounded?: boolean;
  confidenceScore?: number;
  messageId?: string;
  isStreaming?: boolean;
  showCitations?: boolean;
}

export function ChatMessage({
  role,
  content,
  citations = [],
  isGrounded = false,
  confidenceScore,
  messageId,
  isStreaming = false,
  showCitations = true,
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const isUser = role === "user";

  const handleFeedback = async (type: "up" | "down") => {
    if (!messageId || submittingFeedback) return;
    setSubmittingFeedback(true);
    setFeedback(type);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatMessageId: messageId,
          type: type === "up" ? "THUMBS_UP" : "THUMBS_DOWN",
        }),
      });
    } catch {
      // Fail silently
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar — assistant only */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-vault-600 to-vault-800 flex items-center justify-center shadow-glow">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn("flex flex-col gap-2 max-w-[80%]", isUser && "items-end")}>
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-vault-600 text-white rounded-tr-sm"
              : "bg-surface-600 text-white/90 border border-white/8 rounded-tl-sm"
          )}
        >
          {isStreaming && !content ? (
            <TypingIndicator />
          ) : (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: formatMessageContent(content),
              }}
            />
          )}
        </div>

        {/* Citations */}
        {!isUser && showCitations && citations.length > 0 && isGrounded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-xs text-white/30 flex items-center gap-1 px-1">
              <BookOpen className="w-3 h-3" />
              Sources
            </p>
            <div className="flex flex-wrap gap-1.5">
              {citations.map((cite, i) => (
                <CitationBadge key={i} citation={cite} />
              ))}
            </div>
          </motion.div>
        )}

        {/* No-grounding notice */}
        {!isUser && !isGrounded && content && (
          <div className="flex items-center gap-1.5 px-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-400/70">
              No source material found for this answer
            </span>
          </div>
        )}

        {/* Feedback buttons — assistant messages only */}
        {!isUser && messageId && !isStreaming && (
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => handleFeedback("up")}
              className={cn(
                "p-1 rounded-lg transition-all",
                feedback === "up"
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-white/20 hover:text-white/50 hover:bg-white/5"
              )}
              aria-label="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className={cn(
                "p-1 rounded-lg transition-all",
                feedback === "down"
                  ? "text-red-400 bg-red-500/10"
                  : "text-white/20 hover:text-white/50 hover:bg-white/5"
              )}
              aria-label="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CitationBadge({ citation }: { citation: Citation }) {
  return (
    <div className="group relative">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vault-900/60 border border-vault-500/20 text-xs text-vault-300 cursor-default hover:border-vault-500/40 transition-colors">
        <BookOpen className="w-3 h-3 opacity-60" />
        <span className="max-w-[150px] truncate">{citation.notebookName}</span>
        {citation.sourceTitle && (
          <>
            <span className="text-vault-500">·</span>
            <span className="max-w-[120px] truncate text-vault-400">{citation.sourceTitle}</span>
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-vault-400 animate-typing"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

// Simple markdown-to-HTML formatter
function formatMessageContent(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-white/10 rounded text-xs">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br/>")
    .replace(/^(?!<)(.+)$/gm, '$1');
}
