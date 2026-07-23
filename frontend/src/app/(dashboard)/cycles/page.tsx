"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat2, Plus, Loader2, Calendar, CheckCircle2,
  Circle, PlayCircle, MoreHorizontal, Target,
  X, Zap
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { formatShortDate, cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace.store";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const PROJECT_ID = "default"; // Mocking for now, would be from context/url

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

function ProgressRing({ percentage, size = 40 }: { percentage: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)" strokeWidth={2.5} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium text-white/80">
        {Math.round(percentage)}
      </div>
    </div>
  );
}

export default function CyclesPage() {
  const queryClient = useQueryClient();
  const { currentWorkspaceSlug: WORKSPACE_SLUG } = useWorkspaceStore();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cycles", PROJECT_ID],
    queryFn: () => api.get<Cycle[]>(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/cycles`),
    enabled: !!PROJECT_ID && !!WORKSPACE_SLUG,
  });
  
  const cycles: Cycle[] = (data && data.data) ? data.data : [];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-8 h-16 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-[16px] font-medium tracking-tight">Cycles</h1>
          <p className="text-[13px] text-muted-foreground tracking-tight">Time-boxed engineering momentum.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background hover:opacity-90 transition-opacity rounded-md text-[13px] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Cycle
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[800px] mx-auto space-y-12">
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : cycles.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                <Repeat2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold mb-2">No cycles yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Create your first cycle to group issues into time-boxed sprints.
              </p>
            </div>
          ) : (
            <>
              {/* Active Cycle */}
              {cycles.some(c => c.status === "started") && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <h2 className="text-[13px] font-medium tracking-wider uppercase text-muted-foreground">Active Cycle</h2>
                  </div>
                  
                  {cycles.filter(c => c.status === "started").map(cycle => (
                    <CycleCard key={cycle.id} cycle={cycle} isActive />
                  ))}
                </div>
              )}

              {/* Upcoming Cycles */}
              {cycles.some(c => c.status === "draft") && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <h2 className="text-[13px] font-medium tracking-wider uppercase text-muted-foreground">Upcoming</h2>
                  </div>
                  <div className="space-y-3">
                    {cycles.filter(c => c.status === "draft").map(cycle => (
                      <CycleCard key={cycle.id} cycle={cycle} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Cycles */}
              {cycles.some(c => c.status === "completed") && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-border/50" />
                    <h2 className="text-[13px] font-medium tracking-wider uppercase text-muted-foreground">Completed</h2>
                  </div>
                  <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                    {cycles.filter(c => c.status === "completed").map(cycle => (
                      <CycleCard key={cycle.id} cycle={cycle} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function CycleCard({ cycle, isActive = false }: { cycle: Cycle, isActive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex items-center justify-between p-5 rounded-xl transition-all cursor-pointer border",
        isActive 
          ? "bg-card border-border shadow-sm ring-1 ring-primary/10" 
          : "bg-background border-transparent hover:bg-card hover:border-border"
      )}
    >
      <div className="flex items-center gap-5">
        <div className={cn("p-3 rounded-full", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <Repeat2 className="w-6 h-6" />
        </div>
        
        <div>
          <h3 className={cn("font-medium tracking-tight mb-1", isActive ? "text-[16px] text-foreground" : "text-[14px] text-muted-foreground")}>
            {cycle.name}
          </h3>
          <div className="flex items-center gap-3 text-[12px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {cycle.start_date ? formatShortDate(cycle.start_date) : "TBD"} - {cycle.end_date ? formatShortDate(cycle.end_date) : "TBD"}
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{cycle.completed_issue_count} / {cycle.issue_count} issues</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-border hover:bg-muted transition-colors text-muted-foreground">
          View Issues
        </button>
      </div>
    </motion.div>
  );
}
