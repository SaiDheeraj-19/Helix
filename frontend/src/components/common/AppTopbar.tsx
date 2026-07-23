"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Sun, Moon, PanelLeftClose, PanelLeftOpen,
  Plus, ChevronDown, LogOut, Settings, User, Command,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { getInitials, getUserColor, cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { NotificationsBell } from "@/components/common/NotificationsBell";

export function AppTopbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { sidebarCollapsed, setSidebarCollapsed, openCommandPalette, openCreateIssue } = useUIStore();
  const { user, clearAuth } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => usersApi.me(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const profile = profileData?.data || user;

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
    toast.success("Signed out");
  };

  const isDark = theme === "dark";

  return (
    <header
      className="flex items-center justify-between px-3 flex-shrink-0 border-b"
      style={{
        height: "48px",
        background: "rgb(var(--color-background))",
        borderColor: "rgb(var(--color-border))",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* ── Left ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "rgb(var(--color-foreground-muted))" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgb(var(--color-foreground))";
            e.currentTarget.style.background = "rgb(var(--color-muted))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgb(var(--color-foreground-muted))";
            e.currentTarget.style.background = "transparent";
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Center: Search ────────────────────────────────── */}
      <button
        onClick={openCommandPalette}
        className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
        style={{
          border: "1px solid rgb(var(--color-border))",
          background: "rgb(var(--color-muted))",
          color: "rgb(var(--color-foreground-muted))",
          width: "260px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgb(var(--color-border-strong))";
          e.currentTarget.style.background = "rgb(var(--color-accent))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgb(var(--color-border))";
          e.currentTarget.style.background = "rgb(var(--color-muted))";
        }}
        aria-label="Open command palette"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left text-[13px]">Search or jump to…</span>
        <div className="flex items-center gap-0.5">
          <kbd
            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
            style={{
              background: "rgb(var(--color-background))",
              border: "1px solid rgb(var(--color-border))",
              color: "rgb(var(--color-foreground-muted))",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </button>

      {/* ── Right ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* New Issue */}
        <button
          onClick={() => openCreateIssue()}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-white transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, rgb(var(--color-primary)), #6d3cf0)",
            boxShadow: "0 1px 3px rgba(37,117,255,0.3)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          aria-label="Create new issue"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Issue</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "rgb(var(--color-foreground-muted))" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgb(var(--color-foreground))";
            e.currentTarget.style.background = "rgb(var(--color-muted))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgb(var(--color-foreground-muted))";
            e.currentTarget.style.background = "transparent";
          }}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <NotificationsBell />

        {/* User Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-md ml-1 transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--color-muted))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              aria-label="Open user menu"
            >
              {profile?.avatar_url ? (
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || ""}
                  className="w-6 h-6 rounded-full object-cover"
                  style={{ border: "1px solid rgb(var(--color-border))" }}
                />
              ) : (
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold",
                    user ? getUserColor(user.id) : "bg-blue-500"
                  )}
                >
                  {user ? getInitials(user.display_name) : "?"}
                </div>
              )}
              <ChevronDown className="w-3 h-3" style={{ color: "rgb(var(--color-foreground-muted))" }} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[210px] rounded-xl p-1 outline-none animate-in fade-in-0 zoom-in-95"
              style={{
                background: "rgb(var(--color-card))",
                border: "1px solid rgb(var(--color-border))",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* User info */}
              <div
                className="px-2 py-2.5 mb-1 border-b"
                style={{ borderColor: "rgb(var(--color-border))" }}
              >
                <div className="flex items-center gap-2.5">
                  {profile?.avatar_url ? (
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.avatar_url}
                      alt={profile?.display_name || ""}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      style={{ border: "1px solid rgb(var(--color-border))" }}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                        user ? getUserColor(user.id) : "bg-blue-500"
                      )}
                    >
                      {user ? getInitials(user.display_name) : "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "rgb(var(--color-foreground))", letterSpacing: "-0.01em" }}>
                      {profile?.display_name || user?.display_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "rgb(var(--color-foreground-muted))" }}>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <DropdownMenuItem
                icon={User}
                label="Profile"
                onClick={() => router.push("/settings/profile")}
              />
              <DropdownMenuItem
                icon={Settings}
                label="Settings"
                onClick={() => router.push("/settings")}
              />

              <div className="my-1 border-t" style={{ borderColor: "rgb(var(--color-border))" }} />

              <DropdownMenuItem
                icon={LogOut}
                label="Sign out"
                onClick={handleLogout}
                danger
              />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

function DropdownMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item asChild>
      <button
        onClick={onClick}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded-lg transition-colors cursor-pointer outline-none"
        style={{
          color: danger ? "rgb(var(--color-danger))" : "rgb(var(--color-foreground))",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = danger
            ? "rgba(var(--color-danger), 0.08)"
            : "rgb(var(--color-muted))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    </DropdownMenu.Item>
  );
}
