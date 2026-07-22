"use client";

/**
 * Helix — Issue Detail Panel
 * Full-featured side panel for viewing and editing an issue.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, MessageSquare, Activity, Paperclip,
  Flag, Calendar, User, Tag, MoreHorizontal, ExternalLink,
  Edit2, Trash2, Check, ChevronDown, Zap, Sparkles
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { issuesApi, projectsApi, aiApi } from "@/lib/api";
import { cn, formatDate, formatRelativeDate } from "@/lib/utils";
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

  // Fetch issue
  const { data: issueData, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => issuesApi.get(issueId),
  });
  const issue: Issue | undefined = issueData?.data;

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ["comments", issueId],
    queryFn: () => issuesApi.getComments(issueId),
    enabled: activeTab === "comments",
  });
  const comments: Comment[] = commentsData?.data || [];

  // Update mutation
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => issuesApi.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onClose();
      toast.success("Issue deleted");
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; content_html: string }) =>
      issuesApi.addComment(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", issueId] });
    },
  });

  useEffect(() => {
    if (issue) setEditTitle(issue.title);
  }, [issue]);

  // AI Mutations
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

  const suggestLabelsMutation = useMutation({
    mutationFn: () => aiApi.suggestLabels(issueId),
    onSuccess: (res) => {
      const labels = res.data;
      if (labels.length === 0) {
        toast.info("AI couldn't find matching labels");
      } else {
        toast.success(`Suggested Labels: ${labels.join(", ")}`);
        // In a real app, this would automatically apply them or open a confirm dialog
      }
    },
    onError: () => toast.error("Failed to suggest labels"),
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const PRIORITY_OPTIONS = [
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
    { value: "none", label: "No priority" },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[580px] lg:w-[640px] bg-background border-l border-border flex flex-col shadow-2xl"
        >
          {isLoading || !issue ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border flex-shrink-0">
                <span className="text-xs font-mono text-muted-foreground">
                  #{issue.sequence_id}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => window.open(`/issues/${issueId}`, "_blank")}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Open full page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* More actions */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={4}
                      className="z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg"
                    >
                      <DropdownMenu.Item asChild>
                        <button
                          onClick={() => deleteMutation.mutate()}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete issue
                        </button>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-5 space-y-5">
                  {/* Title */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-lg font-semibold bg-muted/50 rounded-lg p-2 border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMutation.mutate({ title: editTitle })}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h1
                      className="text-lg font-semibold cursor-text hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {issue.title}
                    </h1>
                  )}

                  {/* Properties */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* State */}
                    <PropertyRow label="State" icon={<IssueStateIcon state={issue.state as any} />}>
                      <span className="text-sm">{(issue.state as any)?.name}</span>
                    </PropertyRow>

                    {/* Priority */}
                    <PropertyRow label="Priority" icon={<IssuePriorityIcon priority={issue.priority} />}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="flex items-center gap-1 text-sm hover:text-foreground text-muted-foreground transition-colors">
                            {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="z-50 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg"
                          >
                            {PRIORITY_OPTIONS.map((opt) => (
                              <DropdownMenu.Item key={opt.value} asChild>
                                <button
                                  onClick={() => updateMutation.mutate({ priority: opt.value })}
                                  className={cn(
                                    "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-muted",
                                    issue.priority === opt.value && "font-medium text-primary"
                                  )}
                                >
                                  <IssuePriorityIcon priority={opt.value} />
                                  {opt.label}
                                </button>
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </PropertyRow>

                    {/* Due date */}
                    <PropertyRow label="Due date" icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}>
                      {issue.due_date ? (
                        <span className={cn(
                          "text-sm",
                          new Date(issue.due_date) < new Date() ? "text-red-500" : ""
                        )}>
                          {formatDate(issue.due_date)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No due date</span>
                      )}
                    </PropertyRow>

                    {/* Estimate */}
                    <PropertyRow label="Estimate" icon={<Flag className="w-3.5 h-3.5 text-muted-foreground" />}>
                      <span className="text-sm text-muted-foreground">
                        {issue.estimate ? `${issue.estimate} pts` : "No estimate"}
                      </span>
                    </PropertyRow>

                    {/* Assignees */}
                    <PropertyRow label="Assignees" icon={<User className="w-3.5 h-3.5 text-muted-foreground" />}>
                      {issue.assignees && issue.assignees.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {issue.assignees.slice(0, 3).map((a) => (
                            <div
                              key={(a as any).id}
                              className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium"
                              title={(a as any).display_name}
                            >
                              {((a as any).display_name || "?")[0]}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </PropertyRow>

                    {/* Labels */}
                    <PropertyRow label="Labels" icon={<Tag className="w-3.5 h-3.5 text-muted-foreground" />}>
                      {issue.labels && issue.labels.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {issue.labels.slice(0, 3).map((l) => (
                            <span
                              key={(l as any).id}
                              className="px-1.5 py-0.5 text-xs rounded-full"
                              style={{ backgroundColor: `${(l as any).color}20`, color: (l as any).color }}
                            >
                              {(l as any).name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No labels</span>
                      )}
                    </PropertyRow>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Description
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => summarizeMutation.mutate()}
                          disabled={summarizeMutation.isPending}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {summarizeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI Summarize
                        </button>
                        <button
                          onClick={() => suggestLabelsMutation.mutate()}
                          disabled={suggestLabelsMutation.isPending}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {suggestLabelsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                          Suggest Labels
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none min-h-[80px] rounded-lg border border-transparent hover:border-input hover:bg-muted/30 transition-colors p-2 -m-2 cursor-text">
                      {issue.description_html ? (
                        <div dangerouslySetInnerHTML={{ __html: issue.description_html }} />
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Add a description...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-t border-border">
                  <div className="flex px-5">
                    {(["comments", "activity"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                          activeTab === tab
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab === "comments" ? <MessageSquare className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === "comments" && comments.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full">
                            {comments.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="px-5 py-4">
                    {activeTab === "comments" && (
                      <CommentsTab
                        comments={comments}
                        onAddComment={(content, html) =>
                          addCommentMutation.mutate({ content, content_html: html })
                        }
                        isPending={addCommentMutation.isPending}
                      />
                    )}
                    {activeTab === "activity" && <ActivityTab issueId={issueId} />}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────
// Property Row
// ─────────────────────────────────────────────

function PropertyRow({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Comments Tab
// ─────────────────────────────────────────────

function CommentsTab({ comments, onAddComment, isPending }: {
  comments: Comment[];
  onAddComment: (content: string, html: string) => void;
  isPending: boolean;
}) {
  const [content, setContent] = useState("");
  const [contentHtml, setContentHtml] = useState("");

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {c.actor?.display_name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{c.actor?.display_name}</span>
              <span className="text-xs text-muted-foreground">{formatRelativeDate(c.created_at)}</span>
            </div>
            <div
              className="text-sm prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: c.content_html }}
            />
          </div>
        </div>
      ))}

      {/* Add comment */}
      <div className="border-t border-border pt-4">
        <RichTextEditor
          placeholder="Add a comment... (Ctrl+Enter to submit)"
          content={content}
          onUpdate={(html, text) => {
            setContentHtml(html);
            setContent(text);
          }}
          onSubmit={() => {
            if (content.trim()) {
              onAddComment(content, contentHtml);
              setContent("");
              setContentHtml("");
            }
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              if (content.trim()) {
                onAddComment(content, contentHtml);
                setContent("");
                setContentHtml("");
              }
            }}
            disabled={!content.trim() || isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Activity Tab
// ─────────────────────────────────────────────

function ActivityTab({ issueId }: { issueId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["activities", issueId],
    queryFn: () => issuesApi.getActivities(issueId),
  });
  const activities = data?.data || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-16"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {(activities as any[]).map((a: any) => (
        <div key={a.id} className="flex gap-2.5 text-sm">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Activity className="w-3 h-3 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium">{a.actor?.display_name || "Someone"}</span>
            {a.activity_type === "created" && <span className="text-muted-foreground"> created this issue</span>}
            {a.activity_type === "updated" && (
              <span className="text-muted-foreground">
                {" "}changed <span className="font-medium text-foreground">{a.field}</span> from{" "}
                <span className="line-through">{a.old_value || "—"}</span> to{" "}
                <span className="font-medium text-foreground">{a.new_value}</span>
              </span>
            )}
            {a.activity_type === "commented" && <span className="text-muted-foreground"> added a comment</span>}
            <span className="text-xs text-muted-foreground ml-2">{formatRelativeDate(a.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
