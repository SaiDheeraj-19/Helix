"use client";

/**
 * Helix — Preferences Settings Page
 * Theme selection and UI preferences.
 */

import { useTheme } from "next-themes";
import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { Monitor, Sun, Moon, Check } from "lucide-react";
import { toast } from "sonner";

const THEMES = [
  { value: "light", label: "Light", icon: Sun, description: "A clean, bright interface" },
  { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes at night" },
  { value: "system", label: "System", icon: Monitor, description: "Follow your OS setting" },
] as const;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();

  const updateMutation = useMutation({
    mutationFn: (data: { timezone?: string; locale?: string }) => usersApi.update(data),
    onSuccess: () => toast.success("Preferences saved"),
    onError: () => toast.error("Failed to save preferences"),
  });

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-bold mb-1">Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Customize how Helix looks and feels for you.
        </p>
      </div>

      {/* Theme Section */}
      <section>
        <h2 className="text-sm font-semibold mb-1">Interface Theme</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Choose the color scheme for your workspace.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isSelected = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {/* Theme preview mockup */}
                <div className={cn(
                  "w-full h-16 rounded-lg border overflow-hidden",
                  t.value === "dark" ? "bg-zinc-900 border-zinc-700" :
                  t.value === "light" ? "bg-white border-zinc-200" :
                  "bg-gradient-to-r from-white to-zinc-900 border-zinc-400"
                )}>
                  <div className={cn(
                    "h-3 border-b flex items-center px-2 gap-1",
                    t.value === "dark" ? "border-zinc-700 bg-zinc-800" :
                    t.value === "light" ? "border-zinc-200 bg-zinc-50" :
                    "border-zinc-300 bg-zinc-100"
                  )}>
                    {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c) => (
                      <div key={c} className={cn("w-1.5 h-1.5 rounded-full", c)} />
                    ))}
                  </div>
                  <div className="flex gap-1 p-1.5">
                    <div className={cn("w-1/3 rounded", t.value === "dark" ? "bg-zinc-700" : "bg-zinc-200")} style={{ height: 20 }} />
                    <div className="flex-1 space-y-1">
                      <div className={cn("h-1.5 rounded w-3/4", t.value === "dark" ? "bg-zinc-700" : "bg-zinc-200")} />
                      <div className={cn("h-1.5 rounded w-1/2", t.value === "dark" ? "bg-zinc-800" : "bg-zinc-100")} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <t.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Timezone */}
      <section className="pt-6 border-t border-border">
        <h2 className="text-sm font-semibold mb-1">Timezone</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Used for due dates, timestamps, and notifications.
        </p>
        <div className="max-w-sm">
          <select
            defaultValue={user?.timezone || "UTC"}
            onChange={(e) => updateMutation.mutate({ timezone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Language */}
      <section className="pt-6 border-t border-border">
        <h2 className="text-sm font-semibold mb-1">Language</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Select your preferred language for the interface.
        </p>
        <div className="max-w-sm">
          <select
            defaultValue={user?.locale || "en"}
            onChange={(e) => updateMutation.mutate({ locale: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </section>
    </div>
  );
}
