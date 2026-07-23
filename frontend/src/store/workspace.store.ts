import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface WorkspaceState {
  currentWorkspaceSlug: string;
  currentOrgSlug: string;

  setWorkspace: (orgSlug: string, workspaceSlug: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    immer((set) => ({
      currentWorkspaceSlug: "default",
      currentOrgSlug: "default",

      setWorkspace: (orgSlug, workspaceSlug) => {
        set((state) => {
          state.currentOrgSlug = orgSlug;
          state.currentWorkspaceSlug = workspaceSlug;
        });
      },
    })),
    {
      name: "helix-workspace",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
