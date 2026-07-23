"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { AppSidebar } from "@/components/common/AppSidebar";
import { AppTopbar } from "@/components/common/AppTopbar";
import { CommandPalette } from "@/components/common/CommandPalette";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { openCommandPalette } = useUIStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── Loading screen ──────────────────────────────────── */
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "rgb(var(--color-background))" }}
      >
        <div className="flex flex-col items-center gap-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg relative"
            style={{
              background: "linear-gradient(135deg, #2575ff, #6d3cf0)",
              boxShadow: "0 0 32px rgba(37,117,255,0.4)",
            }}
          >
            H
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ border: "1px solid rgba(37,117,255,0.5)" }}
              animate={{ scale: [1, 1.15, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "rgb(var(--color-primary))" }}
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "rgb(var(--color-background))" }}
    >
      {/* ── Sidebar ─────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 52 : 232 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-shrink-0 border-r overflow-hidden relative z-10"
        style={{
          background: "rgb(var(--color-sidebar))",
          borderColor: "rgb(var(--color-sidebar-border))",
        }}
      >
        <AppSidebar />
      </motion.div>

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar />
        <main
          className="flex-1 overflow-auto"
          style={{ background: "rgb(var(--color-background))" }}
        >
          <motion.div
            key="page"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Command Palette ──────────────────────────────── */}
      <CommandPalette />

      {/* ── Create Issue Modal ───────────────────────────── */}
      <CreateIssueModal />

      {/* ── Create Meeting Modal ─────────────────────────── */}
      <CreateMeetingModal />
    </div>
  );
}
