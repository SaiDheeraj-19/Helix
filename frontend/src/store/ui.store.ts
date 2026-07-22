/**
 * Helix — UI Zustand Store
 * Manages global UI state: sidebar, command palette, modals.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ViewType } from "@/types";

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Command Palette
  commandPaletteOpen: boolean;

  // Create Issue Modal
  createIssueOpen: boolean;
  createIssueProjectId: string | null;

  // Notifications panel
  notificationsPanelOpen: boolean;

  // Issue view
  activeView: ViewType;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openCreateIssue: (projectId?: string) => void;
  closeCreateIssue: () => void;
  toggleNotifications: () => void;
  setActiveView: (view: ViewType) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    sidebarOpen: true,
    sidebarCollapsed: false,
    commandPaletteOpen: false,
    createIssueOpen: false,
    createIssueProjectId: null,
    notificationsPanelOpen: false,
    activeView: "list",

    toggleSidebar: () =>
      set((s) => {
        s.sidebarOpen = !s.sidebarOpen;
      }),

    setSidebarCollapsed: (collapsed) =>
      set((s) => {
        s.sidebarCollapsed = collapsed;
      }),

    openCommandPalette: () =>
      set((s) => {
        s.commandPaletteOpen = true;
      }),

    closeCommandPalette: () =>
      set((s) => {
        s.commandPaletteOpen = false;
      }),

    openCreateIssue: (projectId) =>
      set((s) => {
        s.createIssueOpen = true;
        s.createIssueProjectId = projectId ?? null;
      }),

    closeCreateIssue: () =>
      set((s) => {
        s.createIssueOpen = false;
        s.createIssueProjectId = null;
      }),

    toggleNotifications: () =>
      set((s) => {
        s.notificationsPanelOpen = !s.notificationsPanelOpen;
      }),

    setActiveView: (view) =>
      set((s) => {
        s.activeView = view;
      }),
  }))
);
