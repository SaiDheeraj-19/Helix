"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutList, LayoutGrid, Search, Loader2, Inbox, SlidersHorizontal, Settings2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";

import { issuesApi, projectsApi } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { useProjectWebSocket } from "@/hooks/useWebSocket";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import { IssueStateIcon } from "@/components/issues/IssueStateIcon";
import type { Issue, IssueState } from "@/types";

const WORKSPACE_SLUG = "default";

const KanbanBoard = dynamic(
  () => import("@/components/issues/KanbanBoard").then((m) => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => <LoadingState /> }
);
const IssueDetailPanel = dynamic(
  () => import("@/components/issues/IssueDetailPanel").then((m) => ({ default: m.IssueDetailPanel })),
  { ssr: false }
);

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function IssuesPage() {
  const params = useParams();
  const projectIdentifier = params?.identifier as string;
  const { setActiveView, activeView } = useUIStore();

  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("-created_at");

  // Fetch project
  const { data: projectData } = useQuery({
    queryKey: ["project", WORKSPACE_SLUG, projectIdentifier],
    queryFn: () => projectsApi.get(WORKSPACE_SLUG, projectIdentifier),
    enabled: !!projectIdentifier,
  });
  const project = projectData?.data;

  // Initialize Realtime Sync Engine for this project
  useProjectWebSocket(project?.id || null);

  // Fetch states
  const { data: statesData } = useQuery({
    queryKey: ["states", project?.id],
    queryFn: () => projectsApi.getStates(project!.id),
    enabled: !!project?.id,
  });
  const states: IssueState[] = statesData?.data || [];

  // Fetch issues
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ["issues", project?.id, { search, orderBy }],
    queryFn: () => issuesApi.list(project!.id, { search, order_by: orderBy, per_page: 200 }),
    enabled: !!project?.id,
  });
  const issues: Issue[] = (issuesData?.data as any)?.items || [];

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // Dense
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full bg-[#090909] text-white overflow-hidden">
      {/* 
        Project Header — Minimal & Industrial
        Border bottom is extremely subtle.
      */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        {project && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded"
              style={{ backgroundColor: project.color, color: "#fff" }}
            >
              {project.icon || project.name[0]}
            </div>
            <h1 className="text-[15px] font-medium tracking-tight" style={{ letterSpacing: "-0.01em" }}>
              {project.name}
            </h1>
            <span className="text-[13px] text-white/40 font-mono tracking-tight ml-1">
              {project.identifier}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* View Toggles & Search */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 group-focus-within:text-white/80 transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="w-48 pl-8 pr-3 py-1.5 text-[13px] bg-[#111111] border border-[rgba(255,255,255,0.06)] rounded-md text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          <div className="flex items-center p-0.5 bg-[#111111] border border-[rgba(255,255,255,0.06)] rounded-md">
            {(["list", "board"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={cn(
                  "p-1.5 rounded-[4px] transition-all",
                  activeView === v
                    ? "bg-[#222222] text-white shadow-sm"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {v === "list" ? <LayoutList className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <button className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-all border border-transparent hover:border-[rgba(255,255,255,0.06)]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {project && (
            <button
              onClick={() => useUIStore.getState().openCreateIssue(project.id)}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-gray-200 transition-colors rounded-md text-[13px] font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Issue
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === "list" ? (
          <IssueListView
            issues={issues}
            states={states}
            isLoading={isLoading}
            parentRef={parentRef}
            virtualizer={virtualizer}
          />
        ) : (
          project ? <KanbanBoard projectId={project.id} /> : null
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dense Issue List View
// ─────────────────────────────────────────────
function IssueListView({ issues, states, isLoading, parentRef, virtualizer }: any) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-[13px]">
        No issues found. Press <kbd className="mx-1 px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">C</kbd> to create one.
      </div>
    );
  }

  const grouped = states.reduce((acc: Record<string, Issue[]>, state: IssueState) => {
    acc[state.id] = issues.filter((i: Issue) => (i.state as any).id === state.id);
    return acc;
  }, {});

  return (
    <div className="flex h-full">
      <div className="flex-1 h-full overflow-y-auto" ref={parentRef}>
        <div className="pb-24">
          {states.map((state: IssueState) => {
            const stateIssues = grouped[state.id] || [];
            if (stateIssues.length === 0) return null;

            return (
              <div key={state.id} className="mb-6">
                {/* Section Header */}
                <div className="flex items-center gap-2 px-6 py-2 sticky top-0 bg-[#090909]/90 backdrop-blur-md z-10 border-b border-[rgba(255,255,255,0.03)] mb-1">
                  <IssueStateIcon state={state} size="sm" />
                  <span className="text-[13px] font-medium text-white/80">{state.name}</span>
                  <span className="text-[11px] text-white/40 font-mono ml-1">{stateIssues.length}</span>
                </div>

                {/* Rows */}
                <div className="px-4">
                  {stateIssues.map((issue: Issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onClick={() => setSelectedIssueId(issue.id)}
                      isSelected={selectedIssueId === issue.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedIssueId && (
          <IssueDetailPanel
            issueId={selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// High-Density Issue Row
// ─────────────────────────────────────────────
function IssueRow({ issue, onClick, isSelected }: { issue: Issue; onClick: () => void; isSelected: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all border border-transparent",
        isSelected 
          ? "bg-[#181818] border-[rgba(255,255,255,0.08)]" 
          : "hover:bg-[#111111] hover:border-[rgba(255,255,255,0.04)]"
      )}
    >
      <div className="w-4 flex-shrink-0 flex items-center justify-center text-white/40 group-hover:text-white/60">
        <IssuePriorityIcon priority={issue.priority} />
      </div>
      
      <span className="text-[12px] font-mono text-white/40 w-12 flex-shrink-0">
        #{issue.sequence_id}
      </span>

      <span className="flex-1 text-[13px] text-white/90 truncate leading-tight">
        {issue.title}
      </span>

      <div className="flex items-center gap-4 flex-shrink-0">
        {issue.due_date && (
          <span className={cn(
            "text-[12px]",
            new Date(issue.due_date) < new Date() ? "text-red-400" : "text-white/40"
          )}>
            {formatRelativeDate(issue.due_date)}
          </span>
        )}

        <div className="w-5 h-5 rounded-full bg-[#222] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-white/70 overflow-hidden">
          {issue.assignees && issue.assignees.length > 0 ? (
            ((issue.assignees[0] as any).display_name || "?")[0]
          ) : (
            <span className="opacity-0">-</span>
          )}
        </div>
      </div>
    </div>
  );
}
