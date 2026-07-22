"use client";

/**
 * Helix — Kanban Board
 * Drag-and-drop issue board using dnd-kit.
 * Columns = issue states. Cards = issues.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Plus, GripVertical, Loader2 } from "lucide-react";
import { issuesApi, projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import { IssueStateIcon } from "@/components/issues/IssueStateIcon";
import type { Issue, IssueState } from "@/types";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// Kanban Board
// ─────────────────────────────────────────────

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch states
  const { data: statesData, isLoading: statesLoading } = useQuery({
    queryKey: ["states", projectId],
    queryFn: () => projectsApi.getStates(projectId),
  });
  const states: IssueState[] = statesData?.data || [];

  // Fetch issues
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ["issues", projectId, {}],
    queryFn: () => issuesApi.list(projectId, { per_page: 200 }),
  });
  const issues: Issue[] = (issuesData?.data as any)?.items || [];

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: ({ issueId, stateId, sortOrder }: { issueId: string; stateId: string; sortOrder: number }) =>
      issuesApi.move(issueId, { state_id: stateId, sort_order: sortOrder }),
    onError: () => {
      toast.error("Failed to move issue");
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

  // Group issues by state
  const grouped = states.reduce((acc: Record<string, Issue[]>, state) => {
    acc[state.id] = issues
      .filter((i) => (i.state as any).id === state.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {});

  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === event.active.id);
    if (issue) setActiveIssue(issue);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveIssue(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const issueId = active.id as string;
      const draggedIssue = issues.find((i) => i.id === issueId);
      if (!draggedIssue) return;

      // Determine target state
      let targetStateId = over.id as string;
      let targetSortOrder = 0;

      // If dropped on a card, get its state
      const targetIssue = issues.find((i) => i.id === over.id);
      if (targetIssue) {
        targetStateId = (targetIssue.state as any).id;
        targetSortOrder = targetIssue.sort_order - 0.5;
      } else {
        // Dropped on a column — put at the bottom
        const columnIssues = grouped[targetStateId] || [];
        const last = columnIssues[columnIssues.length - 1];
        targetSortOrder = last ? last.sort_order + 1000 : 1000;
      }

      // Optimistic update
      queryClient.setQueryData(["issues", projectId, {}], (old: any) => {
        if (!old?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((i: Issue) =>
              i.id === issueId
                ? { ...i, state: { ...(i.state as any), id: targetStateId }, sort_order: targetSortOrder }
                : i
            ),
          },
        };
      });

      moveMutation.mutate({ issueId, stateId: targetStateId, sortOrder: targetSortOrder });
    },
    [issues, grouped, projectId, queryClient, moveMutation]
  );

  if (statesLoading || issuesLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden px-6 py-4 pb-6">
        {states.map((state) => (
          <KanbanColumn
            key={state.id}
            state={state}
            issues={grouped[state.id] || []}
            onIssueClick={setSelectedIssueId}
            selectedIssueId={selectedIssueId}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeIssue && (
          <KanbanCard
            issue={activeIssue}
            isDragging
            onClick={() => {}}
            isSelected={false}
          />
        )}
      </DragOverlay>

      {/* Issue Detail Panel */}
      {selectedIssueId && (
        <IssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </DndContext>
  );
}

// ─────────────────────────────────────────────
// Kanban Column
// ─────────────────────────────────────────────

interface KanbanColumnProps {
  state: IssueState;
  issues: Issue[];
  onIssueClick: (id: string) => void;
  selectedIssueId: string | null;
}

function KanbanColumn({ state, issues, onIssueClick, selectedIssueId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: state.id });

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <IssueStateIcon state={state} />
        <span className="text-sm font-medium flex-1">{state.name}</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {issues.length}
        </span>
        <button
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Add issue to this state"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 rounded-xl p-2 min-h-[200px] space-y-2 transition-colors overflow-y-auto",
            isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-muted/40"
          )}
        >
          {issues.map((issue) => (
            <SortableKanbanCard
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick(issue.id)}
              isSelected={selectedIssueId === issue.id}
            />
          ))}
          {issues.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/50">
              No issues
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sortable Card Wrapper
// ─────────────────────────────────────────────

function SortableKanbanCard({ issue, onClick, isSelected }: {
  issue: Issue; onClick: () => void; isSelected: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <KanbanCard
        issue={issue}
        onClick={onClick}
        isSelected={isSelected}
        dragHandleProps={listeners}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Kanban Card
// ─────────────────────────────────────────────

interface KanbanCardProps {
  issue: Issue;
  onClick: () => void;
  isSelected: boolean;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function KanbanCard({ issue, onClick, isSelected, isDragging, dragHandleProps }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border p-3 cursor-pointer group transition-all",
        isDragging ? "shadow-xl rotate-1 border-primary/30" : "hover:shadow-sm hover:border-primary/20",
        isSelected ? "border-primary/40 bg-primary/5" : "border-border"
      )}
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium flex-1 leading-relaxed line-clamp-3">
          {issue.title}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2.5 pl-5">
        <IssuePriorityIcon priority={issue.priority} size="xs" />

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {issue.labels.slice(0, 2).map((l) => (
              <span
                key={(l as any).id}
                className="px-1.5 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: `${(l as any).color}20`, color: (l as any).color }}
              >
                {(l as any).name}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Assignees */}
        {issue.assignees && issue.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {issue.assignees.slice(0, 2).map((a) => (
              <div
                key={(a as any).id}
                className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium border-2 border-card"
              >
                {((a as any).display_name || "?")[0]}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Issue Detail Panel import
// ─────────────────────────────────────────────
import dynamic from "next/dynamic";
const IssueDetailPanel = dynamic(
  () => import("@/components/issues/IssueDetailPanel").then((m) => ({ default: m.IssueDetailPanel })),
  { ssr: false }
);
