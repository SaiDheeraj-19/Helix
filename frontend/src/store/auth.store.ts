import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User } from "@/types";
import { tokenStore } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshToken: string | null;

  // Actions
  setUser: (user: User, accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      refreshToken: null,

      setUser: (user, accessToken, refreshToken) => {
        tokenStore.set(accessToken);
        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.isLoading = false;
          if (refreshToken) {
            state.refreshToken = refreshToken;
          }
        });
      },

      clearAuth: () => {
        tokenStore.clear();
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.isLoading = false;
          state.refreshToken = null;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },
    })),
    {
      name: "helix-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Rehydrate the in-memory access token from localStorage if available
          // (refresh token is stored in state; new access token will be fetched on next 401)
          state.setLoading(false);
        }
      },
    }
  )
);
