"use client";

/**
 * Helix — AI Assistant Page
 * Streaming chat UI backed by Ollama (primary) or Groq (fallback).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, Sparkles, X, User, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { tokenStore } from "@/lib/api-client";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Break down a user authentication feature into issues",
  "Write a bug report for a login page crash on mobile",
  "What makes a good sprint planning session?",
  "Suggest priorities for a product launch checklist",
  "Help me write an acceptance criteria for a checkout flow",
];

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className={cn("group max-w-[80%] relative", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "text-white rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          )}
          style={isUser ? { background: "linear-gradient(135deg, #3b82f6, #6366f1)" } : undefined}
        >
          {message.content}
          {message.streaming && (
            <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Copy button */}
        {!isUser && !message.streaming && (
          <button
            onClick={() => onCopy(message.content)}
            className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: content.trim() };
    const assistantId = crypto.randomUUID();

    setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", streaming: true }]);
    setInput("");
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      const token = tokenStore.get();
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, stream: true }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
                );
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }

      // Finalize: remove streaming flag
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content || "(Cancelled)", streaming: false } : m)
        );
      } else {
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: "⚠️ AI service is unavailable. Make sure Ollama is running locally (`ollama serve`) or configure a Groq API key.", streaming: false }
            : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold flex items-center gap-1.5">
              Helix AI
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold uppercase tracking-wide">Beta</span>
            </h1>
            <p className="text-xs text-muted-foreground">Powered by Ollama (local) · Groq fallback</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto pt-8"
          >
            {/* Welcome */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                Hi {user?.display_name?.split(" ")[0] || "there"} 👋
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                I&apos;m Helix AI — your project management co-pilot. I can help you plan features, write issue descriptions, suggest priorities, and more.
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-center mb-3">Try asking…</p>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card text-sm hover:border-primary/40 hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 pb-4">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} onCopy={handleCopy} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-6 pt-3 border-t border-border bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-input bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Helix AI anything about your project…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none max-h-36 px-2 py-1.5 placeholder:text-muted-foreground disabled:opacity-60"
              style={{ minHeight: 36 }}
            />

            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex-shrink-0"
                title="Stop generating"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Shift+Enter for new line · Enter to send · AI can make mistakes
          </p>
        </div>
      </div>
    </div>
  );
}
