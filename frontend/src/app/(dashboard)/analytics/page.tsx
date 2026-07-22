"use client";

/**
 * Helix — Analytics Dashboard
 * Project health: issue breakdown, velocity, workload charts.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Loader2, TrendingUp, CheckCircle2, CircleDot, Clock, Users } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { api } from "@/lib/api-client";
import { projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";


const WORKSPACE_SLUG = "default";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  none: "#6b7280",
};

const GROUP_COLORS: Record<string, string> = {
  backlog: "#6b7280",
  unstarted: "#8b5cf6",
  started: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Fetch projects to populate the selector
  const { data: projectsData } = useQuery({
    queryKey: ["projects", WORKSPACE_SLUG],
    queryFn: () => projectsApi.list(WORKSPACE_SLUG),
  });
  const projects = projectsData?.data || [];

  // Auto-select first project
  const projectId = selectedProjectId || projects[0]?.id || "";

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics", "overview", projectId],
    queryFn: () => api.get(`/api/v1/analytics/projects/${projectId}/overview`),
    enabled: !!projectId,
  });

  const { data: velocityData, isLoading: velocityLoading } = useQuery({
    queryKey: ["analytics", "velocity", projectId],
    queryFn: () => api.get(`/api/v1/analytics/projects/${projectId}/velocity?weeks=8`),
    enabled: !!projectId,
  });

  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ["analytics", "workload", projectId],
    queryFn: () => api.get(`/api/v1/analytics/projects/${projectId}/assignee-workload`),
    enabled: !!projectId,
  });

  const overview = (overviewData?.data as any) || null;
  const velocity = (velocityData?.data as any) || [];
  const workload = (workloadData?.data as any) || [];

  const isLoading = overviewLoading || !projectId;

  return (
    <div className="h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto px-6 py-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track project health, velocity, and team workload.
            </p>
          </div>

          {/* Project selector */}
          <select
            value={projectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !overview ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No data available for this project yet. Create some issues to see analytics.
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Issues" value={overview.total} icon={CircleDot} color="text-blue-500" bg="bg-blue-500/10" />
              <StatCard label="Open Issues" value={overview.open_count} icon={TrendingUp} color="text-amber-500" bg="bg-amber-500/10" />
              <StatCard label="Completed" value={overview.completed_count} icon={CheckCircle2} color="text-green-500" bg="bg-green-500/10" />
              <StatCard label="Overdue" value={overview.overdue_count} icon={Clock} color="text-red-500" bg="bg-red-500/10" />
            </div>

            {/* Charts row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Priority pie chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-4">Issues by Priority</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={overview.by_priority.filter((d: any) => d.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                    >
                      {overview.by_priority.map((entry: any) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                      formatter={(val: number, name: string) => [val, name.charAt(0).toUpperCase() + name.slice(1)]}
                    />
                    <Legend formatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* State group bar chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-4">Issues by Workflow Stage</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={overview.by_group} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {overview.by_group.map((entry: any) => (
                        <Cell key={entry.name} fill={GROUP_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Velocity chart */}
            {velocity.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-1">Weekly Velocity</h2>
                <p className="text-xs text-muted-foreground mb-4">Issues completed per week (last 8 weeks)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={velocity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#velocityGrad)"
                      dot={{ fill: "#3b82f6", r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Assignee workload */}
            {workload.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" /> Assignee Workload
                </h2>
                <p className="text-xs text-muted-foreground mb-4">Open issues assigned per team member</p>
                <div className="space-y-3">
                  {workload.map((member: any) => {
                    const maxCount = workload[0]?.count || 1;
                    const pct = Math.round((member.count / maxCount) * 100);
                    return (
                      <div key={member.name} className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                            {(member.name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{member.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{member.count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #6366f1)" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
