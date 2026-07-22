"use client";

/**
 * Helix — Cycles Page
 * List and manage sprints/iterations for a project.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Repeat2, Plus, Loader2, Calendar, CheckCircle2,
  Circle, PlayCircle, MoreHorizontal, ChevronRight,
  Target, AlertCircle,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatShortDate, cn } from "@/lib/utils";

const WORKSPACE_SLUG = "default";

interface Cycle {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "started" | "completed";
  start_date?: string;
  end_date?: string;
  issue_count: number;
  completed_issue_count: number;
  progress_percentage: number;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Circle, color: "text-muted-foreground", bg: "bg-muted" },
  started: { label: "Active", icon: PlayCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
};

function ProgressRing({ percentage, size = 48 }: { percentage: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={3} fill="none" className="text-muted/30" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="currentColor" strokeWidth={3} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-primary transition-all duration-700"
      />
    </svg>
  );
}

export default function CyclesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "" });

  // Note: In a real flow, the project ID would come from the URL. Using a placeholder here.
  const PROJECT_ID = ""; // TODO: wire from URL param / workspace context

  const { data, isLoading } = useQuery({
    queryKey: ["cycles", PROJECT_ID],
    queryFn: () => api.get<Cycle[]>(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/cycles`),
    enabled: !!PROJECT_ID,
  });
  const cycles: Cycle[] = (data?.data as any) || [];

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/cycles`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles", PROJECT_ID] });
      setCreateOpen(false);
      setForm({ name: "", description: "", start_date: "", end_date: "" });
      toast.success("Cycle created");
    },
    onError: () => toast.error("Failed to create cycle"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/cycles/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cycles", PROJECT_ID] }),
    onError: () => toast.error("Failed to update status"),
  });

  const now = new Date();

  return (
    <div className="h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto px-6 py-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Repeat2 className="w-5 h-5 text-primary" />
              Cycles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Time-boxed sprints to organize and ship work.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            <Plus className="w-4 h-4" />
            New Cycle
          </button>
        </div>

        {/* Stats row */}
        {cycles.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Cycles", value: cycles.length, icon: Repeat2, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Active", value: cycles.filter(c => c.status === "started").length, icon: PlayCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Completed", value: cycles.filter(c => c.status === "completed").length, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                  <s.icon className={cn("w-4 h-4", s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cycles list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="text-center py-20 rounded-xl border border-dashed border-border">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Repeat2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-2">No cycles yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Create your first sprint to start organizing and time-boxing your work.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              <Plus className="w-4 h-4" /> Create first cycle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle, idx) => {
              const cfg = STATUS_CONFIG[cycle.status];
              const Icon = cfg.icon;
              const isOverdue = cycle.end_date && new Date(cycle.end_date) < now && cycle.status !== "completed";

              return (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl border border-border bg-card p-5 flex items-center gap-5 hover:shadow-sm transition-shadow"
                >
                  {/* Progress ring */}
                  <div className="relative flex-shrink-0">
                    <ProgressRing percentage={cycle.progress_percentage} size={52} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                      {Math.round(cycle.progress_percentage)}%
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{cycle.name}</h3>
                      <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", cfg.bg, cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-500">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {cycle.completed_issue_count}/{cycle.issue_count} issues
                      </span>
                      {(cycle.start_date || cycle.end_date) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {cycle.start_date ? formatShortDate(cycle.start_date) : "?"}
                          {" → "}
                          {cycle.end_date ? formatShortDate(cycle.end_date) : "?"}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden w-full max-w-sm">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${cycle.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" className="z-50 w-44 rounded-xl border border-border bg-popover p-1 shadow-lg">
                          {cycle.status === "draft" && (
                            <DropdownMenu.Item asChild>
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: cycle.id, status: "started" })}
                                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer flex items-center gap-2"
                              >
                                <PlayCircle className="w-4 h-4 text-blue-500" /> Start Cycle
                              </button>
                            </DropdownMenu.Item>
                          )}
                          {cycle.status === "started" && (
                            <DropdownMenu.Item asChild>
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: cycle.id, status: "completed" })}
                                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Complete
                              </button>
                            </DropdownMenu.Item>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Create Cycle Modal */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
              <h2 className="text-lg font-semibold mb-1">Create a Cycle</h2>
              <p className="text-sm text-muted-foreground mb-6">A sprint to time-box work and track progress.</p>

              <div className="space-y-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Sprint 1, Q3 Release, ..."
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Start date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">End date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="What is this cycle about?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.name.trim() || createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Cycle
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
