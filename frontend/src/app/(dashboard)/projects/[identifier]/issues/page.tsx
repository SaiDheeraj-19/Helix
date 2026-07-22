"use client";

/**
 * Helix — Issue List View
 * Virtualized list of issues with filters and quick-create.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CircleDot, Plus, Filter, SlidersHorizontal, Search,
  LayoutList, LayoutGrid, Calendar, ArrowUpDown,
  ChevronDown, Loader2, Inbox,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { issuesApi, projectsApi } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import { IssueStateIcon } from "@/components/issues/IssueStateIcon";
import type { Issue, IssueState, ViewType } from "@/types";

const WORKSPACE_SLUG = "default"; // TODO: from URL

export default function IssuesPage() {
  const params = useParams();
  const projectIdentifier = params?.identifier as string;
  const queryClient = useQueryClient();
  const { setActiveView, activeView } = useUIStore();

  // Filters state
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("-created_at");

  // Fetch project
  const { data: projectData } = useQuery({
    queryKey: ["project", WORKSPACE_SLUG, projectIdentifier],
    queryFn: () => projectsApi.get(WORKSPACE_SLUG, projectIdentifier),
    enabled: !!projectIdentifier,
  });
  const project = projectData?.data;

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
    queryFn: () => issuesApi.list(project!.id, { search, order_by: orderBy, per_page: 100 }),
    enabled: !!project?.id,
  });
  const issues: Issue[] = (issuesData?.data as any)?.items || [];

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
        {/* Project name */}
        {project && (
          <div className="flex items-center gap-2 mr-3">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: project.color }}
            >
              {project.icon || project.name[0]}
            </div>
            <span className="text-sm font-semibold">{project.name}</span>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {project.identifier}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter issues..."
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg border border-border bg-muted/50">
          {(["list", "board"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                activeView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title={v === "list" ? "List view" : "Board view"}
            >
              {v === "list" ? <LayoutList className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* New Issue */}
        {project && (
          <button
            onClick={() => useUIStore.getState().openCreateIssue(project.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Issue
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === "list" ? (
          <IssueListView
            issues={issues}
            states={states}
            isLoading={isLoading}
            parentRef={parentRef}
            virtualizer={virtualizer}
          />
        ) : (
          <KanbanRedirect projectId={project?.id} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Issue List View
// ─────────────────────────────────────────────

function IssueListView({ issues, states, isLoading, parentRef, virtualizer }: any) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No issues yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create your first issue to get started.
        </p>
      </div>
    );
  }

  // Group by state
  const grouped = states.reduce((acc: Record<string, Issue[]>, state: IssueState) => {
    acc[state.id] = issues.filter((i: Issue) => (i.state as any).id === state.id);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-auto px-6 py-4 space-y-1">
      {states.map((state: IssueState) => {
        const stateIssues = grouped[state.id] || [];
        if (stateIssues.length === 0) return null;

        return (
          <div key={state.id} className="mb-4">
            <div className="flex items-center gap-2 py-2 px-2 sticky top-0 bg-background/90 backdrop-blur-sm z-10">
              <IssueStateIcon state={state} />
              <span className="text-sm font-medium">{state.name}</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {stateIssues.length}
              </span>
            </div>

            {stateIssues.map((issue: Issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onClick={() => setSelectedIssueId(issue.id)}
                isSelected={selectedIssueId === issue.id}
              />
            ))}
          </div>
        );
      })}

      {/* Issue Detail Panel */}
      {selectedIssueId && (
        <IssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Issue Row
// ─────────────────────────────────────────────

function IssueRow({
  issue, onClick, isSelected,
}: {
  issue: Issue; onClick: () => void; isSelected: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors",
        isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/60"
      )}
    >
      {/* Priority */}
      <IssuePriorityIcon priority={issue.priority} className="flex-shrink-0" />

      {/* State */}
      <IssueStateIcon state={issue.state as any} size="sm" />

      {/* Title */}
      <span className="flex-1 text-sm truncate">{issue.title}</span>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
        {/* Identifier */}
        <span className="font-mono hidden sm:block">
          {/* project identifier from context */}
          #{issue.sequence_id}
        </span>

        {/* Assignees */}
        {issue.assignees && issue.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {issue.assignees.slice(0, 2).map((a) => (
              <div
                key={(a as any).id}
                className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium border border-background"
                title={(a as any).display_name}
              >
                {((a as any).display_name || "?")[0]}
              </div>
            ))}
          </div>
        )}

        {/* Due date */}
        {issue.due_date && (
          <span className={cn(
            new Date(issue.due_date) < new Date() ? "text-red-500" : ""
          )}>
            {formatRelativeDate(issue.due_date)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function KanbanRedirect({ projectId }: { projectId?: string }) {
  if (!projectId) return null;
  return <KanbanBoard projectId={projectId} />;
}

// Lazy import of Kanban to avoid SSR issues with dnd-kit
import dynamic from "next/dynamic";
const KanbanBoard = dynamic(
  () => import("@/components/issues/KanbanBoard").then((m) => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> }
);
const IssueDetailPanel = dynamic(
  () => import("@/components/issues/IssueDetailPanel").then((m) => ({ default: m.IssueDetailPanel })),
  { ssr: false }
);
