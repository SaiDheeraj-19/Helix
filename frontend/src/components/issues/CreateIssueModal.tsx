"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Calendar, Tag, User } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { issuesApi, projectsApi } from "@/lib/api";
import { useUIStore } from "@/store/ui.store";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { IssuePriorityIcon } from "@/components/issues/IssuePriorityIcon";
import { IssueStateIcon } from "@/components/issues/IssueStateIcon";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  priority: z.string().default("none"),
  state_id: z.string().optional(),
  estimate: z.number().min(0).optional().or(z.literal("")),
  due_date: z.string().optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

export function CreateIssueModal() {
  const { createIssueProjectId, closeCreateIssue } = useUIStore();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");

  const isOpen = !!createIssueProjectId;
  const projectId = createIssueProjectId as string;

  const { data: statesData } = useQuery({
    queryKey: ["states", projectId],
    queryFn: () => projectsApi.getStates(projectId),
    enabled: isOpen,
  });
  const states = useMemo(() => statesData?.data || [], [statesData?.data]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: { priority: "none" },
  });

  // Set default state when states load
  useEffect(() => {
    if (states.length > 0) {
      const defaultState = states.find(s => s.is_default) || states[0];
      setValue("state_id", defaultState.id);
    }
  }, [states, setValue]);

  const createMutation = useMutation({
    mutationFn: (d: IssueFormData & { description: string, description_html: string }) =>
      issuesApi.create(projectId, {
        ...d,
        estimate: d.estimate === "" ? undefined : d.estimate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      toast.success("Issue created successfully");
      handleClose();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create issue"),
  });

  const handleClose = () => {
    closeCreateIssue();
    reset();
    setDescription("");
    setDescriptionHtml("");
  };

  const onSubmit = (data: IssueFormData) => {
    createMutation.mutate({ ...data, description, description_html: descriptionHtml });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-2xl rounded-xl border border-border bg-popover shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
              <Dialog.Title className="text-sm font-medium flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">NEW ISSUE</span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded-md hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <form id="create-issue-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Title */}
              <div>
                <input
                  {...register("title")}
                  placeholder="Issue title"
                  className="w-full text-lg font-medium bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                  autoFocus
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div>
                <RichTextEditor
                  placeholder="Add description..."
                  content={descriptionHtml}
                  onUpdate={(html, text) => {
                    setDescriptionHtml(html);
                    setDescription(text);
                  }}
                  className="border-none bg-transparent -ml-3"
                  compact
                />
              </div>

              {/* Attributes row */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                {/* State */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">State</span>
                  <select
                    {...register("state_id")}
                    className="text-xs bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {states.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <select
                    {...register("priority")}
                    className="text-xs bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Estimate */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Estimate</span>
                  <input
                    type="number"
                    {...register("estimate", { valueAsNumber: true })}
                    placeholder="pts"
                    className="w-16 text-xs bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 border rounded bg-background">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 border rounded bg-background">Enter</kbd> to submit
              </p>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  form="create-issue-form"
                  disabled={isSubmitting || createMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Issue
                </button>
              </div>
            </div>

          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
