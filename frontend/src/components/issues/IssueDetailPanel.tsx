"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, MessageSquare, Activity,
  Calendar, User, Tag, MoreHorizontal, ExternalLink,
  Edit2, Trash2, Check, Zap, Sparkles
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

import { issuesApi, projectsApi, aiApi } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Issue, Comment } from "@/types";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import { IssueStateIcon } from "@/components/issues/IssueStateIcon";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

interface IssueDetailPanelProps {
  issueId: string;
  onClose: () => void;
}

export function IssueDetailPanel({ issueId, onClose }: IssueDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const { data: issueData, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => issuesApi.get(issueId),
  });
  const issue: Issue | undefined = issueData?.data;

  const { data: commentsData } = useQuery({
    queryKey: ["comments", issueId],
    queryFn: () => issuesApi.getComments(issueId),
    enabled: activeTab === "comments",
  });
  const comments: Comment[] = commentsData?.data || [];

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof issuesApi.update>[1]) =>
      issuesApi.update(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setIsEditing(false);
    },
    onError: () => toast.error("Failed to update issue"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => issuesApi.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onClose();
      toast.success("Issue deleted");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; content_html: string }) =>
      issuesApi.addComment(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: () => aiApi.summarizeIssue(issueId),
    onSuccess: (res) => {
      toast.success("AI Summary Generated", {
        description: res.data.summary,
        duration: 8000,
      });
    },
    onError: () => toast.error("Failed to summarize issue"),
  });

  useEffect(() => {
    if (issue) setEditTitle(issue.title);
  }, [issue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%", opacity: 0.5, scale: 0.98 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: "100%", opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[680px] bg-[#090909] border-l border-[rgba(255,255,255,0.06)] shadow-2xl flex flex-col text-white"
      >
        {isLoading || !issue ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : (
          <>
            {/* Minimal Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-mono text-white/40 tracking-tight">
                  {issue.project_id ? "HELIX" : "PROJ"}-{issue.sequence_id}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => summarizeMutation.mutate()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.1))] text-[#8B5CF6] hover:bg-[rgba(139,92,246,0.2)] transition-colors border border-[rgba(139,92,246,0.2)] text-[12px] font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {summarizeMutation.isPending ? "Analyzing..." : "Ask AI"}
                </button>

                <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-2" />

                <button
                  onClick={onClose}
                  className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar flex">
              {/* Main Content Area */}
              <div className="flex-1 px-8 py-8 flex flex-col border-r border-[rgba(255,255,255,0.04)]">
                {/* Title */}
                {isEditing ? (
                  <div className="mb-6 flex gap-2">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 text-[20px] font-medium bg-[#111] border border-[rgba(255,255,255,0.1)] rounded p-2 text-white focus:outline-none focus:border-white/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMutation.mutate({ title: editTitle });
                      }}
                    />
                    <button
                      onClick={() => updateMutation.mutate({ title: editTitle })}
                      className="px-3 bg-white text-black rounded text-[13px] font-medium"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div
                    className="group mb-6 flex items-start justify-between cursor-text"
                    onClick={() => setIsEditing(true)}
                  >
                    <h2 className="text-[20px] font-medium leading-snug tracking-tight text-white/90">
                      {issue.title}
                    </h2>
                  </div>
                )}

                {/* Description Editor (Seamless) */}
                <div className="flex-1 prose prose-sm prose-invert max-w-none text-white/70">
                  <RichTextEditor
                    content={issue.description_html || ""}
                    placeholder="Add a description..."
                    onUpdate={(html) => updateMutation.mutate({ description_html: html })}
                    editable={true}
                    className="border-transparent bg-transparent hover:bg-white/5 focus-within:bg-[#111] focus-within:border-[rgba(255,255,255,0.1)] p-0"
                  />
                </div>

                {/* Activity / Comments */}
                <div className="mt-12 border-t border-[rgba(255,255,255,0.04)] pt-6">
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => setActiveTab("comments")}
                      className={cn(
                        "text-[13px] font-medium pb-1 border-b-2 transition-colors",
                        activeTab === "comments" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
                      )}
                    >
                      Comments <span className="ml-1 text-[11px] bg-white/10 px-1.5 py-0.5 rounded">{comments.length}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("activity")}
                      className={cn(
                        "text-[13px] font-medium pb-1 border-b-2 transition-colors",
                        activeTab === "activity" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
                      )}
                    >
                      Activity
                    </button>
                  </div>

                  {activeTab === "comments" ? (
                    <div className="space-y-6">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#222] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[12px] text-white/70 flex-shrink-0">
                            {(((comment as any).user as any)?.display_name || "?")[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[13px] font-medium text-white/90">
                                {(comment as any).user?.display_name || "Unknown"}
                              </span>
                              <span className="text-[11px] text-white/40">
                                {formatRelativeDate(comment.created_at)}
                              </span>
                            </div>
                            <div 
                              className="text-[13px] text-white/70 prose prose-sm prose-invert"
                              dangerouslySetInnerHTML={{ __html: comment.content_html }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Comment Box */}
                      <div className="pt-4 mt-4">
                        <RichTextEditor
                          placeholder="Leave a comment..."
                          compact
                          onSubmit={() => {
                            // Handled by actual state in a real impl, mocking for now.
                          }}
                          className="bg-[#111] border-[rgba(255,255,255,0.1)] focus-within:border-white/30"
                        />
                        <div className="flex justify-end mt-2">
                          <button className="px-3 py-1.5 bg-white text-black text-[12px] font-medium rounded hover:bg-gray-200 transition-colors">
                            Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[13px] text-white/40 flex items-center justify-center py-8">
                      No activity to show.
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Properties */}
              <div className="w-[220px] p-6 flex flex-col gap-5 bg-[#0a0a0a]">
                <Property
                  label="State"
                  value={
                    <div className="flex items-center gap-1.5 text-white/80">
                      <IssueStateIcon state={issue.state as any} size="sm" />
                      {(issue.state as any)?.name}
                    </div>
                  }
                />
                
                <Property
                  label="Priority"
                  value={
                    <div className="flex items-center gap-1.5 text-white/80 capitalize">
                      <IssuePriorityIcon priority={issue.priority} />
                      {issue.priority}
                    </div>
                  }
                />

                <Property
                  label="Assignee"
                  value={
                    issue.assignees && issue.assignees.length > 0 ? (
                      <div className="flex items-center gap-2 text-white/80">
                        <div className="w-5 h-5 rounded-full bg-[#222] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-white/70">
                          {((issue.assignees[0] as any).display_name || "?")[0]}
                        </div>
                        <span className="truncate">{(issue.assignees[0] as any).display_name}</span>
                      </div>
                    ) : (
                      <span className="text-white/30">Unassigned</span>
                    )
                  }
                />

                <Property
                  label="Due Date"
                  value={
                    issue.due_date ? (
                      <span className="text-white/80">{formatRelativeDate(issue.due_date)}</span>
                    ) : (
                      <span className="text-white/30">No date</span>
                    )
                  }
                />

                <Property
                  label="Labels"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {issue.labels && issue.labels.length > 0 ? (
                        issue.labels.map((l: any) => (
                          <span key={l.id} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-white/70">
                            {l.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/30">None</span>
                      )}
                    </div>
                  }
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

function Property({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-[13px]">
      <span className="text-white/40">{label}</span>
      <div className="p-1.5 -mx-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-[rgba(255,255,255,0.04)]">
        {value}
      </div>
    </div>
  );
}
