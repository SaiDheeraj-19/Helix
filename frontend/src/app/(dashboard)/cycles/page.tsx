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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const WORKSPACE_SLUG = "default";
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
  const [createOpen, setCreateOpen] = useState(false);

  // Note: Backend might not be fully wired for cycles yet in this mock, so we handle undefined gracefully
  const { data, isLoading } = useQuery({
    queryKey: ["cycles", PROJECT_ID],
    queryFn: () => api.get<Cycle[]>(`/api/v1/workspaces/${WORKSPACE_SLUG}/projects/${PROJECT_ID}/cycles`),
    enabled: !!PROJECT_ID,
  });
  
  // Use mock data if API fails or returns empty so we can showcase the UI
  const cycles: Cycle[] = (data && data.data && data.data.length > 0) ? data.data : [
    {
      id: "c1", name: "Cycle 42: Refactor & Polish", status: "started",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      issue_count: 24, completed_issue_count: 15, progress_percentage: 62.5
    },
    {
      id: "c2", name: "Cycle 43: AI Features", status: "draft",
      start_date: new Date(Date.now() + 8 * 86400000).toISOString(),
      end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      issue_count: 0, completed_issue_count: 0, progress_percentage: 0
    },
    {
      id: "c0", name: "Cycle 41: Q3 Foundation", status: "completed",
      start_date: new Date(Date.now() - 14 * 86400000).toISOString(),
      end_date: new Date(Date.now() - 7 * 86400000).toISOString(),
      issue_count: 31, completed_issue_count: 31, progress_percentage: 100
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#090909] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 h-16 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div>
          <h1 className="text-[16px] font-medium tracking-tight">Cycles</h1>
          <p className="text-[13px] text-white/40 tracking-tight">Time-boxed engineering momentum.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-gray-200 transition-colors rounded-md text-[13px] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Cycle
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[800px] mx-auto space-y-12">
          
          {/* Active Cycle */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <h2 className="text-[13px] font-medium tracking-wider uppercase text-white/60">Active Cycle</h2>
            </div>
            
            {cycles.filter(c => c.status === "started").map(cycle => (
              <CycleCard key={cycle.id} cycle={cycle} isActive />
            ))}
          </div>

          {/* Upcoming Cycles */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <h2 className="text-[13px] font-medium tracking-wider uppercase text-white/60">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {cycles.filter(c => c.status === "draft").map(cycle => (
                <CycleCard key={cycle.id} cycle={cycle} />
              ))}
            </div>
          </div>

          {/* Completed Cycles */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <h2 className="text-[13px] font-medium tracking-wider uppercase text-white/60">Completed</h2>
            </div>
            <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
              {cycles.filter(c => c.status === "completed").map(cycle => (
                <CycleCard key={cycle.id} cycle={cycle} />
              ))}
            </div>
          </div>

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
          ? "bg-[#111] border-[rgba(255,255,255,0.08)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]" 
          : "bg-[#0c0c0c] border-transparent hover:bg-[#111] hover:border-[rgba(255,255,255,0.04)]"
      )}
    >
      <div className="flex items-center gap-5">
        <ProgressRing percentage={cycle.progress_percentage} size={isActive ? 48 : 40} />
        
        <div>
          <h3 className={cn("font-medium tracking-tight mb-1", isActive ? "text-[16px] text-white" : "text-[14px] text-white/80")}>
            {cycle.name}
          </h3>
          <div className="flex items-center gap-3 text-[12px] font-mono text-white/40">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {cycle.start_date ? formatShortDate(cycle.start_date) : "TBD"} - {cycle.end_date ? formatShortDate(cycle.end_date) : "TBD"}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span>{cycle.completed_issue_count} / {cycle.issue_count} issues</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-[rgba(255,255,255,0.1)] hover:bg-white/5 transition-colors text-white/70">
          View Issues
        </button>
      </div>
    </motion.div>
  );
}
