"use client";

/**
 * Helix — Workspace General Settings Page
 * Name, slug, logo, description.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { organizationsApi } from "@/lib/api";
import * as Dialog from "@radix-ui/react-dialog";

const ORG_SLUG = "default"; // TODO: pull from context

const workspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
});

type WorkspaceForm = z.infer<typeof workspaceSchema>;

export default function WorkspaceSettingsPage() {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["org", ORG_SLUG],
    queryFn: () => organizationsApi.get(ORG_SLUG),
  });
  const org = data?.data;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    values: {
      name: (org as any)?.name || "",
      description: (org as any)?.description || "",
    },
  });

  // Note: Full update endpoint would be needed on backend in a full implementation
  const updateMutation = useMutation({
    mutationFn: (_data: WorkspaceForm) => {
      // Stub — backend patch endpoint TBD
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", ORG_SLUG] });
      toast.success("Workspace settings updated");
    },
    onError: () => toast.error("Failed to update workspace"),
  });

  if (isLoading || !org) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-bold mb-1">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace details and configuration.</p>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Workspace Name</label>
          <input
            {...register("name")}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* URL Slug — read-only */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Workspace URL</label>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-border">
              app.helix.io/
            </span>
            <input
              value={(org as any)?.slug}
              disabled
              className="flex-1 px-3 py-2 text-sm bg-background text-muted-foreground cursor-not-allowed focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Contact support to change your workspace URL slug.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="What is this workspace for?"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Plan badge */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                Current Plan: <span className="text-primary capitalize">{(org as any)?.plan || 'Free'}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlimited projects, 10 members. Upgrade for more.
              </p>
            </div>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-border">
        <h2 className="text-sm font-semibold text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete this workspace</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes all projects, issues, and data. This cannot be undone.
            </p>
          </div>
          <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Dialog.Trigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4" />
                Delete Workspace
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Delete workspace</h3>
                      <p className="text-sm text-muted-foreground">This action is irreversible.</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Type <strong className="text-foreground">{(org as any)?.slug}</strong> to confirm deletion.
                  </p>
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={(org as any)?.slug}
                    className="w-full mb-4 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                  />
                  <div className="flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
                    </Dialog.Close>
                    <button
                      disabled={deleteConfirm !== (org as any)?.slug}
                      onClick={() => {
                        toast.error("Contact support to delete a workspace.");
                        setDeleteOpen(false);
                      }}
                      className="px-4 py-2 text-sm text-white bg-destructive rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
                    >
                      Delete Workspace
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </section>
    </div>
  );
}
