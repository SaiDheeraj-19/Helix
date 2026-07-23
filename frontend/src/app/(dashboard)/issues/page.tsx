"use client";

import { motion } from "framer-motion";
import { CircleDot, Plus, Search, Filter } from "lucide-react";
import { useUIStore } from "@/store/ui.store";

export default function MyIssuesPage() {
  const { openCreateIssue } = useUIStore();

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b px-8 py-6 flex items-center justify-between"
        style={{ borderColor: "rgb(var(--color-border))" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(var(--color-primary), 0.1)",
              color: "rgb(var(--color-primary))",
            }}
          >
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "rgb(var(--color-foreground))" }}>
              My Issues
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgb(var(--color-foreground-muted))" }}>
              Issues assigned to you across all projects.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "rgba(var(--color-foreground), 0.05)",
              color: "rgb(var(--color-foreground))",
              border: "1px solid rgb(var(--color-border))",
            }}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button
            onClick={() => openCreateIssue()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-md transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #2575ff, #6d3cf0)" }}
          >
            <Plus className="w-4 h-4" />
            <span>New Issue</span>
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-md w-full p-8 rounded-2xl border"
          style={{
            background: "rgb(var(--color-panel))",
            borderColor: "rgb(var(--color-border))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5"
            style={{
              background: "rgba(var(--color-primary), 0.08)",
              color: "rgb(var(--color-primary))",
            }}
          >
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "rgb(var(--color-foreground))" }}>
            No issues assigned to you
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "rgb(var(--color-foreground-muted))" }}>
            You're all caught up! When issues are assigned to you across your workspace, they will appear here.
          </p>
          <button
            onClick={() => openCreateIssue()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "rgb(var(--color-primary))",
              color: "white",
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Create your first issue</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
