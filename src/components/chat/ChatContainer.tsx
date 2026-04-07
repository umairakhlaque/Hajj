"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, type Citation } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Sparkles, BookOpen } from "lucide-react";
import { ShimmerSkeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isGrounded?: boolean;
  confidenceScore?: number;
  messageId?: string;
}

interface ChatContainerProps {
  tenantSlug: string;
  notebookId?: string;
  collectionId?: string;
  suggestedPrompts?: string[];
  showCitations?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryColor?: string;
}

export function ChatContainer({
  tenantSlug,
  notebookId,
  collectionId,
  suggestedPrompts = [],
  showCitations = true,
  heroTitle = "Ask My Knowledge Base",
  heroSubtitle = "Get instant, grounded answers from your private knowledge vault.",
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scopeType = notebookId ? "notebook" : collectionId ? "collection" : "all";
  const scopeId = notebookId ?? collectionId;

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantSlug }),
          credentials: "include",
        });
      } catch {
        // Ignore — public/anonymous mode
      } finally {
        setIsInitialized(true);
      }
    };
    initSession();
  }, [tenantSlug]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (message: string) => {
    if (isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Add streaming placeholder
    const streamingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: "assistant", content: "", isGrounded: false },
    ]);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          tenantSlug,
          sessionId,
          scopeType,
          scopeId,
          conversationHistory: history,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.data.sessionId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  content: data.data.answer,
                  citations: data.data.citations,
                  isGrounded: data.data.isGrounded,
                  confidenceScore: data.data.confidenceScore,
                  messageId: data.data.messageId,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  content: "I encountered an error. Please try again.",
                  isGrounded: false,
                }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? {
                ...m,
                content: "Connection error. Please check your connection and try again.",
                isGrounded: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, tenantSlug, sessionId, scopeType, scopeId]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {/* Hero / Empty state */}
        <AnimatePresence>
          {isEmpty && isInitialized && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4"
            >
              <div className="mb-6 relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-vault-600 to-vault-900 flex items-center justify-center shadow-premium">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-surface-900" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                {heroTitle}
              </h1>
              <p className="text-white/50 text-base max-w-md leading-relaxed">
                {heroSubtitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            citations={message.citations}
            isGrounded={message.isGrounded}
            confidenceScore={message.confidenceScore}
            messageId={message.messageId}
            isStreaming={
              isLoading &&
              index === messages.length - 1 &&
              message.role === "assistant" &&
              !message.content
            }
            showCitations={showCitations}
          />
        ))}

        {/* Loading skeleton for assistant response */}
        {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-vault-800 flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <ShimmerSkeleton className="h-4 w-3/4" />
              <ShimmerSkeleton className="h-4 w-1/2" />
              <ShimmerSkeleton className="h-4 w-2/3" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-white/8 px-4 py-4 bg-surface-900/80 backdrop-blur-md">
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          disabled={!isInitialized}
          suggestedPrompts={suggestedPrompts}
          showSuggestions={isEmpty && isInitialized}
        />
      </div>
    </div>
  );
}
