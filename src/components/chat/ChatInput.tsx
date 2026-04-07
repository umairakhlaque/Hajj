"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  suggestedPrompts?: string[];
  onSuggestedPrompt?: (prompt: string) => void;
  showSuggestions?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Ask anything about this knowledge base...",
  disabled = false,
  suggestedPrompts = [],
  onSuggestedPrompt,
  showSuggestions = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isLoading, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleSuggestedPrompt = (prompt: string) => {
    onSuggestedPrompt?.(prompt);
    onSend(prompt);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Suggested prompts */}
      <AnimatePresence>
        {showSuggestions && suggestedPrompts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-wrap gap-2"
          >
            {suggestedPrompts.slice(0, 4).map((prompt, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSuggestedPrompt(prompt)}
                disabled={isLoading || disabled}
                className="px-3 py-1.5 text-xs rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 hover:border-vault-500/40 transition-all duration-200 text-left line-clamp-1 max-w-[200px] disabled:opacity-40"
              >
                {prompt}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-white/10 bg-surface-700/60 backdrop-blur-md shadow-glass focus-within:border-vault-500/50 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 bg-transparent text-white placeholder:text-white/30 text-sm leading-relaxed",
            "resize-none border-0 outline-none py-2 px-2 min-h-[40px] max-h-[200px]",
            "scrollbar-thin scrollbar-thumb-white/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{ height: "auto" }}
        />

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
            value.trim() && !isLoading && !disabled
              ? "bg-vault-600 text-white hover:bg-vault-500 shadow-glow"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      <p className="text-center text-xs text-white/20">
        Answers are grounded in your knowledge base · Press Enter to send
      </p>
    </div>
  );
}
