"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CircleDot, FolderKanban, Repeat2,
  BarChart3, Settings, ChevronDown, Plus,
  Inbox, Users, Bot, Loader2, Map, Video, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { getInitials, getUserColor } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types";

const WORKSPACE_SLUG = "default";

const mainNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { label: "My Issues", href: "/issues", icon: CircleDot },
  { label: "Inbox", href: "/inbox", icon: Inbox },
];

const workspaceNavItems = [
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Cycles", href: "/cycles", icon: Repeat2 },
  { label: "Roadmap", href: "/roadmap", icon: Map },
  { label: "Meetings", href: "/meetings", icon: Video },
  { label: "Sticky Notes", href: "/notes", icon: StickyNote },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Members", href: "/settings/workspace/members", icon: Users },
  { label: "AI Assistant", href: "/ai", icon: Bot },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, openCreateIssue } = useUIStore();
  const { user } = useAuthStore();

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", WORKSPACE_SLUG],
    queryFn: () => projectsApi.list(WORKSPACE_SLUG),
    staleTime: 30_000,
  });
  const projects: Project[] = projectsData?.data || [];

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* ── Workspace header ───────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-3 py-3 flex-shrink-0 border-b"
        style={{ borderColor: "rgb(var(--color-sidebar-border))" }}
      >
        <div
          className="w-6.5 h-6.5 w-[26px] h-[26px] flex items-center justify-center flex-shrink-0"
        >
          <Logo />
        </div>

        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex-1 min-w-0 flex items-center justify-between overflow-hidden"
            >
              <div className="min-w-0">
                <p
                  className="text-[13px] font-semibold truncate leading-tight"
                  style={{ color: "rgb(var(--color-foreground))", letterSpacing: "-0.01em" }}
                >
                  Helix Workspace
                </p>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" style={{ color: "rgb(var(--color-foreground-muted))" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* Main */}
        {mainNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href, item.exact)}
            collapsed={sidebarCollapsed}
          />
        ))}

        {/* Workspace section */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pt-4 pb-1 px-2"
            >
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: "rgb(var(--color-foreground-muted))" }}
              >
                Workspace
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarCollapsed && <div className="h-1" />}

        {workspaceNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href)}
            collapsed={sidebarCollapsed}
          />
        ))}

        {/* Projects */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pt-4"
            >
              <div className="flex items-center justify-between px-2 mb-1.5">
                <p
                  className="text-[10.5px] font-semibold uppercase tracking-[0.07em]"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                >
                  Projects
                </p>
                <button
                  onClick={() => router.push("/projects")}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: "rgb(var(--color-foreground-muted))" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgb(var(--color-foreground))")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgb(var(--color-foreground-muted))")}
                  title="View all projects"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {projectsLoading ? (
                <div className="px-2 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "rgb(var(--color-foreground-muted))" }} />
                  <span className="text-xs" style={{ color: "rgb(var(--color-foreground-muted))" }}>Loading…</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="px-2 py-2">
                  <p className="text-xs" style={{ color: "rgb(var(--color-foreground-muted))" }}>
                    No projects yet.{" "}
                    <Link
                      href="/projects"
                      className="transition-colors"
                      style={{ color: "rgb(var(--color-primary))" }}
                    >
                      Create one
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {projects.slice(0, 8).map((project) => {
                    const href = `/projects/${project.identifier.toLowerCase()}/issues`;
                    const active = pathname.startsWith(`/projects/${project.identifier.toLowerCase()}`);
                    return (
                      <Link
                        key={project.id}
                        href={href}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all duration-150 group",
                          active
                            ? "font-medium"
                            : ""
                        )}
                        style={{
                          color: active ? "rgb(var(--color-sidebar-active-fg))" : "rgb(var(--color-sidebar-foreground))",
                          background: active ? "rgb(var(--color-sidebar-active-bg))" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = "rgb(var(--color-sidebar-accent))";
                            e.currentTarget.style.color = "rgb(var(--color-foreground))";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "rgb(var(--color-sidebar-foreground))";
                          }
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ backgroundColor: project.color }}
                        >
                          {project.icon || project.name[0]}
                        </div>
                        <span className="flex-1 truncate">{project.name}</span>
                        <span
                          className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "rgb(var(--color-foreground-muted))" }}
                        >
                          {project.identifier}
                        </span>
                      </Link>
                    );
                  })}
                  {projects.length > 8 && (
                    <Link
                      href="/projects"
                      className="block px-2 py-1.5 text-xs transition-colors"
                      style={{ color: "rgb(var(--color-foreground-muted))" }}
                    >
                      +{projects.length - 8} more
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom section ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t p-2 space-y-0.5"
        style={{ borderColor: "rgb(var(--color-sidebar-border))" }}
      >
        {!sidebarCollapsed && (
          <button
            onClick={() => openCreateIssue()}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium transition-all duration-150"
            style={{ color: "rgb(var(--color-primary))" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(var(--color-primary), 0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>New Issue</span>
          </button>
        )}

        <NavItem
          href="/settings"
          label="Settings"
          icon={Settings}
          isActive={pathname.startsWith("/settings")}
          collapsed={sidebarCollapsed}
        />

        {/* User */}
        <Link
          href="/settings/preferences"
          className="flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-150"
          style={{ color: "rgb(var(--color-sidebar-foreground))" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--color-sidebar-accent))")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0",
              user ? getUserColor(user.id) : "bg-blue-500"
            )}
          >
            {user ? getInitials(user.display_name) : "?"}
          </div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && user && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="min-w-0 flex-1 overflow-hidden"
              >
                <p
                  className="text-[12px] font-medium truncate leading-tight"
                  style={{ color: "rgb(var(--color-foreground))" }}
                >
                  {user.display_name}
                </p>
                <p className="text-[11px] truncate" style={{ color: "rgb(var(--color-foreground-muted))" }}>
                  @{user.username}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </div>
  );
}

// ── Nav Item Component ──────────────────────────────────────

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}

function NavItem({ href, label, icon: Icon, isActive, collapsed, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-150 relative"
      style={{
        color: isActive ? "rgb(var(--color-sidebar-active-fg))" : "rgb(var(--color-sidebar-foreground))",
        background: isActive ? "rgb(var(--color-sidebar-active-bg))" : "transparent",
        fontWeight: isActive ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgb(var(--color-sidebar-accent))";
          e.currentTarget.style.color = "rgb(var(--color-foreground))";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgb(var(--color-sidebar-foreground))";
        }
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: "rgb(var(--color-primary))" }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      )}

      <Icon className="w-4 h-4 flex-shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
              style={{
                background: "rgba(var(--color-primary), 0.12)",
                color: "rgb(var(--color-primary))",
              }}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
