"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, StopCircle, RefreshCw, X } from "lucide-react";
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
  "Summarize the active cycle's progress",
  "Write an acceptance criteria for SAML SSO",
  "What is the team's current velocity?",
];

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, stream: true }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
              if (parsed.error) {
                toast.error("AI service error", { description: parsed.error });
                break;
              }
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
                );
              }
            } catch (e) {
              console.error("SSE parse error", e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("AI service error", { description: err.message });
      }
    } finally {
      setIsStreaming(false);
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-8 h-16 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-[linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.1))] border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] font-medium tracking-tight">Helix Intelligence</h1>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear Context
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 hide-scrollbar">
        <div className="max-w-[720px] mx-auto min-h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center pb-24">
              <h2 className="text-[28px] font-medium tracking-tight mb-2 text-foreground">
                How can I help, {user?.display_name?.split(" ")[0] || "there"}?
              </h2>
              <p className="text-[15px] text-muted-foreground mb-10">
                I can analyze issues, write specs, or query workspace metrics.
              </p>
              
              <div className="grid gap-3 max-w-[500px]">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted hover:border-border/80 transition-all group text-left"
                  >
                    <span className="text-[14px] text-muted-foreground group-hover:text-foreground transition-colors">
                      {prompt}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/60 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12 pb-8">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-6",
                      m.role === "user" ? "flex-row" : "flex-row"
                    )}
                  >
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {m.role === "user" ? "USR" : "HLX"}
                    </div>
                    
                    <div className="flex-1 text-[15px] leading-relaxed font-medium">
                      {m.role === "user" ? (
                        <div className="text-foreground">
                          {m.content}
                        </div>
                      ) : (
                        <div className="text-foreground/80 prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                          {m.content}
                          {m.streaming && (
                            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-8 py-6 bg-background">
        <div className="max-w-[720px] mx-auto relative group">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Helix..."
            rows={1}
            className="w-full bg-card border border-border rounded-xl px-5 py-4 pr-16 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border/80 resize-none transition-all shadow-sm"
            style={{ minHeight: "56px", maxHeight: "200px" }}
          />
          
          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="text-center mt-3">
          <p className="text-[11px] font-mono text-muted-foreground tracking-tight">Helix AI can make mistakes. Verify critical code and metrics.</p>
        </div>
      </div>
    </div>
  );
}
