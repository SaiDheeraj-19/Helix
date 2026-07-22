"use client";

import { motion } from "framer-motion";
import {
  CircleDot, FolderKanban, Repeat2, TrendingUp,
  Plus, ArrowRight, Zap, Bot, Clock, CheckCircle2,
  GitBranch, Sparkles, ChevronRight, Activity, Target,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";

// ── Animation config ──────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ── Stat config ───────────────────────────────────────────

const stats = [
  {
    label: "Open Issues",
    value: "0",
    delta: null,
    icon: CircleDot,
    color: "rgb(var(--color-primary))",
    bg: "rgba(var(--color-primary), 0.08)",
    border: "rgba(var(--color-primary), 0.15)",
  },
  {
    label: "In Progress",
    value: "0",
    delta: null,
    icon: TrendingUp,
    color: "rgb(var(--color-warning))",
    bg: "rgba(var(--color-warning), 0.08)",
    border: "rgba(var(--color-warning), 0.15)",
  },
  {
    label: "Completed Today",
    value: "0",
    delta: null,
    icon: CheckCircle2,
    color: "rgb(var(--color-success))",
    bg: "rgba(var(--color-success), 0.08)",
    border: "rgba(var(--color-success), 0.15)",
  },
  {
    label: "Overdue",
    value: "0",
    delta: null,
    icon: Clock,
    color: "rgb(var(--color-danger))",
    bg: "rgba(var(--color-danger), 0.08)",
    border: "rgba(var(--color-danger), 0.15)",
  },
];

// ── Quick actions ─────────────────────────────────────────

function QuickAction({ icon: Icon, label, href, onClick, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  const cls = "group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer";

  const inner = (
    <>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{
          background: accent
            ? "linear-gradient(135deg, rgb(var(--color-primary)), #6d3cf0)"
            : "rgb(var(--color-muted))",
        }}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{ color: accent ? "#fff" : "rgb(var(--color-foreground-subtle))" }}
        />
      </div>
      <span style={{ color: "rgb(var(--color-foreground))" }}>{label}</span>
    </>
  );

  const style = {
    background: "rgb(var(--color-card))",
    border: "1px solid rgb(var(--color-border))",
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cls}
        style={style}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = accent
            ? "rgba(var(--color-primary), 0.3)"
            : "rgb(var(--color-border-strong))";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgb(var(--color-border))";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={cls}
      style={style}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgb(var(--color-border-strong))";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgb(var(--color-border))";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {inner}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { openCreateIssue } = useUIStore();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.display_name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="h-full overflow-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto px-6 py-8"
      >
        {/* ── Hero Header ──────────────────────────────────── */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p
                className="text-sm mb-1"
                style={{ color: "rgb(var(--color-foreground-muted))" }}
              >
                {today}
              </p>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{
                  color: "rgb(var(--color-foreground))",
                  letterSpacing: "-0.024em",
                }}
              >
                {greeting},{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, rgb(var(--color-primary)), #6d3cf0)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {firstName}
                </span>
              </h1>
              <p
                className="mt-1.5 text-[14px]"
                style={{ color: "rgb(var(--color-foreground-muted))" }}
              >
                Here&apos;s an overview of your workspace today.
              </p>
            </div>

            {/* Streak / status badge */}
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium"
              style={{
                background: "rgba(var(--color-primary), 0.06)",
                border: "1px solid rgba(var(--color-primary), 0.15)",
                color: "rgb(var(--color-primary))",
              }}
            >
              <Activity className="w-4 h-4" />
              <span>Workspace active</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            <QuickAction
              icon={Plus}
              label="New Issue"
              onClick={openCreateIssue}
              accent
            />
            <QuickAction
              icon={FolderKanban}
              label="Projects"
              href="/projects"
            />
            <QuickAction
              icon={Repeat2}
              label="Cycles"
              href="/cycles"
            />
            <QuickAction
              icon={Bot}
              label="AI Assistant"
              href="/ai"
            />
          </div>
        </motion.div>

        {/* ── Stats Row ────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4 transition-all duration-200 cursor-default"
              style={{
                background: "rgb(var(--color-card))",
                border: `1px solid ${s.border}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.06em]"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                >
                  {s.label}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
              </div>
              <div
                className="text-2xl font-bold"
                style={{ color: "rgb(var(--color-foreground))", letterSpacing: "-0.02em" }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Content columns ──────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          {/* ── Left: My Issues ──────────────────────────── */}
          <div className="space-y-5">
            <motion.div
              variants={item}
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgb(var(--color-card))",
                border: "1px solid rgb(var(--color-border))",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgb(var(--color-border))" }}
              >
                <div>
                  <h2
                    className="text-[14px] font-semibold"
                    style={{ color: "rgb(var(--color-foreground))", letterSpacing: "-0.01em" }}
                  >
                    My Issues
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgb(var(--color-foreground-muted))" }}
                  >
                    Issues assigned to you
                  </p>
                </div>
                <Link
                  href="/issues"
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: "rgb(var(--color-primary))" }}
                >
                  View all
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Empty State */}
              <div className="py-16 px-8 text-center">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgb(var(--color-muted))",
                    border: "1px solid rgb(var(--color-border))",
                  }}
                >
                  <Target className="w-5 h-5" style={{ color: "rgb(var(--color-foreground-muted))" }} />
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "rgb(var(--color-foreground))" }}
                >
                  No issues assigned to you
                </p>
                <p
                  className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                >
                  Create a project and start tracking work. Issues you&apos;re assigned will appear here.
                </p>
                <button
                  onClick={() => openCreateIssue()}
                  className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: "rgba(var(--color-primary), 0.08)",
                    color: "rgb(var(--color-primary))",
                    border: "1px solid rgba(var(--color-primary), 0.15)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--color-primary), 0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(var(--color-primary), 0.08)")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create your first issue
                </button>
              </div>
            </motion.div>

            {/* Recent Activity placeholder */}
            <motion.div
              variants={item}
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgb(var(--color-card))",
                border: "1px solid rgb(var(--color-border))",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgb(var(--color-border))" }}
              >
                <div>
                  <h2
                    className="text-[14px] font-semibold"
                    style={{ color: "rgb(var(--color-foreground))", letterSpacing: "-0.01em" }}
                  >
                    Recent Activity
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgb(var(--color-foreground-muted))" }}>
                    Latest changes across your workspace
                  </p>
                </div>
              </div>
              <div className="py-12 px-8 text-center">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgb(var(--color-muted))", border: "1px solid rgb(var(--color-border))" }}
                >
                  <GitBranch className="w-5 h-5" style={{ color: "rgb(var(--color-foreground-muted))" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "rgb(var(--color-foreground))" }}>
                  No activity yet
                </p>
                <p className="text-xs mt-1.5" style={{ color: "rgb(var(--color-foreground-muted))" }}>
                  Start by creating a project or an issue.
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── Right panel ──────────────────────────────── */}
          <div className="space-y-4">
            {/* Active Cycle */}
            <motion.div
              variants={item}
              className="rounded-xl p-5"
              style={{
                background: "rgb(var(--color-card))",
                border: "1px solid rgb(var(--color-border))",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    background: "rgba(var(--color-primary), 0.1)",
                    border: "1px solid rgba(var(--color-primary), 0.2)",
                  }}
                >
                  <Repeat2 className="w-3.5 h-3.5" style={{ color: "rgb(var(--color-primary))" }} />
                </div>
                <h3
                  className="text-[13px] font-semibold"
                  style={{ color: "rgb(var(--color-foreground))" }}
                >
                  Active Cycle
                </h3>
              </div>

              <div className="text-center py-6">
                <p
                  className="text-sm"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                >
                  No active cycle
                </p>
                <Link
                  href="/cycles"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: "rgb(var(--color-primary))" }}
                >
                  Start a sprint
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              variants={item}
              className="rounded-xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(var(--color-primary), 0.05), rgba(109,60,240,0.05))",
                border: "1px solid rgba(var(--color-primary), 0.18)",
              }}
            >
              {/* Glow orb */}
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30"
                style={{
                  background: "radial-gradient(circle, rgba(37,117,255,0.6), transparent)",
                  filter: "blur(20px)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgb(var(--color-primary)), #6d3cf0)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3
                    className="text-[13px] font-semibold"
                    style={{ color: "rgb(var(--color-foreground))" }}
                  >
                    AI Insights
                  </h3>
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                    style={{
                      background: "rgba(var(--color-primary), 0.15)",
                      color: "rgb(var(--color-primary))",
                    }}
                  >
                    Beta
                  </span>
                </div>

                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                >
                  Once you have projects and issues, Helix AI will analyze your
                  workflow and surface smart suggestions, blockers, and
                  predictions here.
                </p>

                <Link
                  href="/ai"
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: "rgba(var(--color-primary), 0.1)",
                    color: "rgb(var(--color-primary))",
                    border: "1px solid rgba(var(--color-primary), 0.2)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--color-primary), 0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(var(--color-primary), 0.1)")}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Try AI Assistant
                </Link>
              </div>
            </motion.div>

            {/* Getting started card */}
            <motion.div
              variants={item}
              className="rounded-xl p-5"
              style={{
                background: "rgb(var(--color-card))",
                border: "1px solid rgb(var(--color-border))",
              }}
            >
              <h3
                className="text-[13px] font-semibold mb-4"
                style={{ color: "rgb(var(--color-foreground))" }}
              >
                Get started
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Create a project", href: "/projects", done: false },
                  { label: "Invite teammates", href: "/settings/workspace/members", done: false },
                  { label: "Create your first issue", href: "#", done: false },
                  { label: "Set up a sprint cycle", href: "/cycles", done: false },
                ].map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="flex items-center gap-2.5 group"
                    onClick={step.href === "#" ? (e) => { e.preventDefault(); openCreateIssue(); } : undefined}
                  >
                    <div
                      className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: step.done
                          ? "rgb(var(--color-success))"
                          : "rgb(var(--color-border-strong))",
                        background: step.done
                          ? "rgba(var(--color-success), 0.1)"
                          : "transparent",
                      }}
                    >
                      {step.done && (
                        <CheckCircle2 className="w-3 h-3" style={{ color: "rgb(var(--color-success))" }} />
                      )}
                    </div>
                    <span
                      className="text-xs transition-colors group-hover:underline underline-offset-2"
                      style={{ color: step.done ? "rgb(var(--color-foreground-muted))" : "rgb(var(--color-foreground))" }}
                    >
                      {step.label}
                    </span>
                    <ChevronRight
                      className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "rgb(var(--color-foreground-muted))" }}
                    />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
