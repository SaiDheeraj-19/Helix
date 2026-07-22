"use client";

import type { Metadata } from "next";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Zap, Shield, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-Native Intelligence",
    desc: "Helix learns your team's patterns and surfaces insights before you ask.",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    desc: "SOC 2 Type II, SSO, RBAC, and end-to-end audit logs built in.",
  },
  {
    icon: Globe,
    title: "Real-Time Collaboration",
    desc: "Live cursors, presence indicators, and instant sync across all devices.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: Dark branding panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[54%] relative overflow-hidden flex-col">
        {/* Deep dark background */}
        <div className="absolute inset-0 auth-panel-gradient" />

        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px",
          }}
        />

        {/* Luminous blue orbs */}
        <div className="absolute inset-0">
          <div
            className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-[0.18]"
            style={{
              background: "radial-gradient(circle, rgba(37,117,255,1) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] rounded-full opacity-[0.14]"
            style={{
              background: "radial-gradient(circle, rgba(109,60,240,1) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute top-[40%] right-[15%] w-[40%] h-[40%] rounded-full opacity-[0.08]"
            style={{
              background: "radial-gradient(circle, rgba(59,147,255,1) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top edge glow */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-40"
          style={{ background: "linear-gradient(90deg, transparent, rgba(59,147,255,0.8), transparent)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-2.5"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2575ff, #6d3cf0)",
                boxShadow: "0 0 20px rgba(37,117,255,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
              }}
            >
              <span className="text-white font-bold text-sm tracking-tight">H</span>
            </div>
            <span className="text-white/90 text-base font-semibold tracking-tight">Helix</span>
          </motion.div>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-auto"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-6"
              style={{
                background: "rgba(37,117,255,0.15)",
                border: "1px solid rgba(37,117,255,0.25)",
              }}
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-blue-300 text-xs font-medium">AI-Powered Project Management</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Ship faster.<br />
              Think{" "}
              <span style={{
                background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                clearer.
              </span>
            </h1>

            <p className="mt-5 text-white/45 text-base leading-relaxed max-w-sm">
              The project management platform designed for teams who move fast and build things that matter.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex items-start gap-3"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(37,117,255,0.12)",
                      border: "1px solid rgba(37,117,255,0.2)",
                    }}
                  >
                    <f.icon className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">{f.title}</p>
                    <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-10 pt-8 border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-6">
              {[
                { value: "50K+", label: "Teams" },
                { value: "4M+", label: "Issues Resolved" },
                { value: "99.99%", label: "Uptime" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-lg font-bold text-white">{s.value}</div>
                  <div className="text-white/35 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right: Auth form panel ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2575ff, #6d3cf0)" }}
            >
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="font-semibold tracking-tight">Helix</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
