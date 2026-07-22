"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FolderKanban, Plus, Moon, Sun, Monitor, LogOut, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";

const WORKSPACE_SLUG = "default"; // TODO: get from global context

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { commandPaletteOpen, closeCommandPalette, openCreateIssue } = useUIStore();
  const { clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const { data: projectsData } = useQuery({
    queryKey: ["projects", WORKSPACE_SLUG],
    queryFn: () => projectsApi.list(WORKSPACE_SLUG),
    enabled: commandPaletteOpen,
  });
  const projects = projectsData?.data || [];

  // Toggle command palette on ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUIStore.getState().commandPaletteOpen
          ? closeCommandPalette()
          : useUIStore.getState().openCommandPalette();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  const runCommand = (command: () => void) => {
    closeCommandPalette();
    command();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      {/* Overlay to close */}
      <div className="absolute inset-0" onClick={closeCommandPalette} />

      <Command
        className="relative w-full max-w-xl rounded-xl border border-border bg-popover shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === "Escape") closeCommandPalette();
        }}
      >
        <div className="flex items-center border-b border-border px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
          <Command.Input
            autoFocus
            placeholder="Type a command or search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          {projects.length > 0 && (
            <Command.Group heading="Projects">
              {projects.map((project: any) => (
                <Command.Item
                  key={project.id}
                  onSelect={() => runCommand(() => router.push(`/projects/${project.identifier.toLowerCase()}/issues`))}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2"
                >
                  <div
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.icon || project.name[0]}
                  </div>
                  <span>{project.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">
                    {project.identifier}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Actions">
            <Command.Item
              onSelect={() => runCommand(() => openCreateIssue(projects[0]?.id))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground gap-2"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span>Create Issue...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">C</span>
              </kbd>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Settings & Preferences">
            <Command.Item
              onSelect={() => runCommand(() => router.push("/settings/profile"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground gap-2"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Settings</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => setTheme("light"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground gap-2"
            >
              <Sun className="w-4 h-4 text-muted-foreground" />
              <span>Light Theme</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => setTheme("dark"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground gap-2"
            >
              <Moon className="w-4 h-4 text-muted-foreground" />
              <span>Dark Theme</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => setTheme("system"))}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-muted aria-selected:text-accent-foreground gap-2"
            >
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span>System Theme</span>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="-mx-1 h-px bg-border my-1" />

          <Command.Group>
            <Command.Item
              onSelect={() => runCommand(handleLogout)}
              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-destructive/10 aria-selected:text-destructive text-destructive gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
