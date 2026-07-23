"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Loader2 } from "lucide-react";

import { issuesApi, projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import type { Issue, IssueState } from "@/types";
import { toast } from "sonner";
import { useUIStore } from "@/store/ui.store";
import { IssueDetailPanel } from "@/components/issues/IssueDetailPanel";

export function KanbanBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: statesData, isLoading: statesLoading } = useQuery({
    queryKey: ["states", projectId],
    queryFn: () => projectsApi.getStates(projectId),
  });
  const states: IssueState[] = statesData?.data || [];

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ["issues", projectId, {}],
    queryFn: () => issuesApi.list(projectId, { per_page: 500 }),
  });
  const issues: Issue[] = useMemo(() => (issuesData?.data as any)?.items || [], [issuesData?.data]);

  const moveMutation = useMutation({
    mutationFn: ({ issueId, stateId, sortOrder }: { issueId: string; stateId: string; sortOrder: number }) =>
      issuesApi.move(issueId, { state_id: stateId, sort_order: sortOrder }),
    onError: () => {
      toast.error("Failed to move issue");
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
  });

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
      const targetStateId = (over.data.current?.sortable?.containerId || over.id) as string;
      
      let targetSortOrder = 1000;
      const targetIssue = issues.find((i) => i.id === over.id);
      if (targetIssue) {
        targetSortOrder = targetIssue.sort_order - 0.5;
      } else {
        const columnIssues = grouped[targetStateId] || [];
        const last = columnIssues[columnIssues.length - 1];
        if (last) targetSortOrder = last.sort_order + 1000;
      }

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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#090909]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 h-full overflow-x-auto overflow-y-hidden px-6 py-4 pb-6">
          {states.map((state) => (
            <KanbanColumn
              key={state.id}
              state={state}
              issues={grouped[state.id] || []}
              projectId={projectId}
              onIssueClick={setSelectedIssueId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "easeOut" }}>
          {activeIssue ? <KanbanCard issue={activeIssue} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

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

function KanbanColumn({ state, issues, projectId, onIssueClick }: { state: IssueState; issues: Issue[]; projectId: string; onIssueClick: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: state.id });

  return (
    <div className="flex flex-col w-[300px] flex-shrink-0 max-h-full">
      <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-[#090909] z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.color }} />
          <h3 className="text-[12px] font-semibold tracking-wider uppercase text-white/60">
            {state.name}
          </h3>
          <span className="text-[11px] text-white/30 font-mono">{issues.length}</span>
        </div>
        <button
          onClick={() => useUIStore.getState().openCreateIssue(projectId, state.id)}
          className="text-white/30 hover:text-white/80 p-1 rounded transition-colors hover:bg-white/5"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-[150px] pb-10 hide-scrollbar"
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {issues.map((issue) => (
              <SortableKanbanCard key={issue.id} issue={issue} onClick={() => onIssueClick(issue.id)} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableKanbanCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[88px] rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] border-dashed opacity-50"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard issue={issue} onClick={onClick} />
    </div>
  );
}

function KanbanCard({ issue, isOverlay, onClick }: { issue: Issue; isOverlay?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[#111111] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 group cursor-grab active:cursor-grabbing transition-all",
        "hover:border-[rgba(255,255,255,0.12)] hover:bg-[#141414]",
        isOverlay && "shadow-[0_8px_30px_rgb(0,0,0,0.8)] border-[rgba(255,255,255,0.1)] scale-105 rotate-1 cursor-grabbing"
      )}
    >
      <div className="text-[13px] text-white/90 leading-snug mb-3 line-clamp-2">
        {issue.title}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/30">
            #{issue.sequence_id}
          </span>
          <div className="text-white/40">
            <IssuePriorityIcon priority={issue.priority} />
          </div>
        </div>

        {issue.assignees && issue.assignees.length > 0 && (
          <div className="w-5 h-5 rounded-full bg-[#222] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-white/70 overflow-hidden">
            {((issue.assignees[0] as any).display_name || "?")[0]}
          </div>
        )}
      </div>
    </div>
  );
}
