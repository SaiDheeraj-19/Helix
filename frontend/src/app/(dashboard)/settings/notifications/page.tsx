"use client";

/**
 * Helix — Notifications Settings Page
 * Control which emails and in-app alerts the user receives.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, GitPullRequest, AtSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotifPref {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  email: boolean;
  inApp: boolean;
}

const DEFAULT_PREFS: NotifPref[] = [
  {
    id: "issue_assigned",
    label: "Issue assigned to me",
    description: "When someone assigns an issue to you",
    icon: GitPullRequest,
    email: true,
    inApp: true,
  },
  {
    id: "issue_mentioned",
    label: "Mentioned in issue",
    description: "When you're @mentioned in an issue or comment",
    icon: AtSign,
    email: true,
    inApp: true,
  },
  {
    id: "issue_comment",
    label: "Comments on my issues",
    description: "When someone comments on an issue you created",
    icon: MessageSquare,
    email: false,
    inApp: true,
  },
  {
    id: "issue_due_soon",
    label: "Due date approaching",
    description: "24h before an issue you're assigned to is due",
    icon: Calendar,
    email: true,
    inApp: true,
  },
  {
    id: "workspace_invite",
    label: "Workspace invitations",
    description: "When you're invited to join a workspace",
    icon: Mail,
    email: true,
    inApp: true,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotifPref[]>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  const updatePref = (id: string, key: "email" | "inApp", value: boolean) => {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
    setSaved(false);
  };

  const handleSave = () => {
    // TODO: persist to backend
    setSaved(true);
    toast.success("Notification preferences saved");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold mb-1">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choose what you want to be notified about and how.
        </p>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span>Event</span>
        <span className="w-16 text-center">Email</span>
        <span className="w-16 text-center">In-App</span>
      </div>

      <div className="divide-y divide-border">
        {prefs.map((pref) => {
          const Icon = pref.icon;
          return (
            <div
              key={pref.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
              </div>
              <div className="w-16 flex justify-center">
                <Toggle
                  checked={pref.email}
                  onChange={(v) => updatePref(pref.id, "email", v)}
                />
              </div>
              <div className="w-16 flex justify-center">
                <Toggle
                  checked={pref.inApp}
                  onChange={(v) => updatePref(pref.id, "inApp", v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
