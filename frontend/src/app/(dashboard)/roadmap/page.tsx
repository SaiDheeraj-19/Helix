"use client";

import { motion } from "framer-motion";
import { Map, Calendar, ArrowRight } from "lucide-react";

export default function RoadmapPage() {
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
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "rgb(var(--color-foreground))" }}>
              Roadmap
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "rgb(var(--color-foreground-muted))" }}>
              High-level timeline and goals across your workspace.
            </p>
          </div>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "rgba(var(--color-foreground), 0.05)",
            color: "rgb(var(--color-foreground))",
            border: "1px solid rgb(var(--color-border))",
          }}
        >
          <Calendar className="w-4 h-4" />
          <span>Q3 2026</span>
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-2xl w-full p-8 rounded-2xl border"
          style={{
            background: "rgb(var(--color-panel))",
            borderColor: "rgb(var(--color-border))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(37,117,255,0.1), rgba(109,60,240,0.1))",
              color: "rgb(var(--color-primary))",
              border: "1px solid rgba(var(--color-primary), 0.2)",
            }}
          >
            <Map className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-3" style={{ color: "rgb(var(--color-foreground))" }}>
            Visual Roadmap (Coming Soon)
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-md mx-auto" style={{ color: "rgb(var(--color-foreground-muted))" }}>
            We&apos;re building a powerful Gantt-style roadmap to help you visualize timelines, dependencies, and high-level project goals across your entire workspace.
          </p>
          
          <div 
            className="flex items-center justify-between p-4 rounded-xl border text-left mx-auto max-w-md"
            style={{ 
              background: "rgba(var(--color-background), 0.5)",
              borderColor: "rgb(var(--color-border))"
            }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "rgb(var(--color-foreground))" }}>Want early access?</p>
              <p className="text-xs mt-1" style={{ color: "rgb(var(--color-foreground-muted))" }}>Join the beta waitlist for advanced features.</p>
            </div>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
              style={{
                background: "rgba(var(--color-primary), 0.1)",
                color: "rgb(var(--color-primary))",
              }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
