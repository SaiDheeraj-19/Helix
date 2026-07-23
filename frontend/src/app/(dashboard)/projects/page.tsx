"use client";

/**
 * Helix — Projects Page
 * Lists all projects in the workspace with a create project flow.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, FolderKanban, Search, Lock, Globe, Eye,
  MoreHorizontal, Archive, Settings, ChevronRight,
  X, Loader2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const WORKSPACE_SLUG = "default"; // TODO: from URL params / store

const PROJECT_COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#f97316", "#84cc16",
];

const projectSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, "Letters and numbers only"),
  description: z.string().max(5000).optional(),
  color: z.string().default("#6366f1"),
  icon: z.string().optional(),
  network: z.enum(["public", "secret", "private"]).default("secret"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// ─────────────────────────────────────────────
// Network Badge
// ─────────────────────────────────────────────

const networkConfig = {
  public: { label: "Public", icon: Globe, color: "text-green-500 bg-green-500/10" },
  secret: { label: "Secret", icon: Eye, color: "text-amber-500 bg-amber-500/10" },
  private: { label: "Private", icon: Lock, color: "text-red-500 bg-red-500/10" },
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ProjectsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", WORKSPACE_SLUG],
    queryFn: () => projectsApi.list(WORKSPACE_SLUG),
  });

  const projects = (data?.data || []).filter((p: Project) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { color: "#6366f1", network: "secret" },
  });

  const watchedName = watch("name", "");

  // Auto-generate identifier from name
  const autoIdentifier = watchedName
    ? watchedName.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase()
    : "";

  const createMutation = useMutation({
    mutationFn: (d: ProjectFormData) =>
      projectsApi.create(WORKSPACE_SLUG, { ...d, color: selectedColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", WORKSPACE_SLUG] });
      toast.success("Project created successfully!");
      setOpen(false);
      reset();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create project"),
  });

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""} in this workspace
            </p>
          </div>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </Dialog.Trigger>

            {/* Create Project Modal */}
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="w-full max-w-[560px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
                >
                  {/* Premium Header */}
                  <div className="relative px-6 py-6 overflow-hidden border-b border-border bg-muted/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                      Create new project
                    </Dialog.Title>
                    <p className="text-sm text-muted-foreground mt-1">Set up a new space for your team's work.</p>
                    <Dialog.Close asChild>
                      <button className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <form
                    onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                    className="p-6 space-y-6"
                  >
                    {/* Basic Info */}
                    <div className="grid grid-cols-[1fr,120px] gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Project name <span className="text-destructive">*</span></label>
                          <input
                            {...register("name")}
                            placeholder="e.g. Frontend Architecture"
                            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            autoFocus
                          />
                          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Identifier <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <input
                              {...register("identifier")}
                              placeholder={autoIdentifier || "FRT"}
                              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background/50 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-16"
                              onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                register("identifier").onChange(e);
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                              ID
                            </div>
                          </div>
                          {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-sm font-medium mb-3 block">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {PROJECT_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setSelectedColor(c);
                                setValue("color", c);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all flex items-center justify-center relative",
                                selectedColor === c ? "scale-110 shadow-sm" : "hover:scale-110 opacity-80 hover:opacity-100"
                              )}
                              style={{ 
                                backgroundColor: c,
                              }}
                            >
                              {selectedColor === c && (
                                <div className="absolute inset-0 rounded-full border-2 border-background ring-2 ring-offset-1" style={{ "--tw-ring-color": c } as any} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        {...register("description")}
                        placeholder="Briefly describe what this project is for..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Visibility & Access</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(["secret", "public", "private"] as const).map((n) => {
                          const cfg = networkConfig[n];
                          const isSelected = watch("network") === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setValue("network", n)}
                              className={cn(
                                "relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all overflow-hidden group",
                                isSelected
                                  ? "border-primary bg-primary/[0.03] shadow-sm"
                                  : "border-border hover:border-border/80 hover:bg-muted/50 bg-background/50"
                              )}
                            >
                              {isSelected && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                              )}
                              <div className={cn("p-1.5 rounded-lg", cfg.color)}>
                                <cfg.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={cn("text-sm font-semibold mb-0.5", isSelected ? "text-primary" : "text-foreground")}>{cfg.label}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                  {n === "secret" && "Visible only to members."}
                                  {n === "public" && "Visible to workspace."}
                                  {n === "private" && "Visible to teams."}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="px-5 py-2.5 text-sm font-medium rounded-xl border border-border bg-background hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="submit"
                        disabled={isSubmitting || createMutation.isPending}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-sm active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                      >
                        {createMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Create project"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <ProjectsSkeleton />
        ) : projects.length === 0 ? (
          <ProjectsEmptyState onCreate={() => setOpen(true)} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {projects.map((project: Project, i: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Project Card
// ─────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const netCfg = networkConfig[project.network as keyof typeof networkConfig] || networkConfig.secret;
  const NetIcon = netCfg.icon;

  return (
    <Link
      href={`/projects/${project.identifier.toLowerCase()}/issues`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: project.color }}
        >
          {project.icon || project.name[0]}
        </div>
        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", netCfg.color)}>
          <NetIcon className="w-3 h-3" />
          {netCfg.label}
        </span>
      </div>

      {/* Name + identifier */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {project.identifier}
          </span>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{project.issue_count ?? 0} issues</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-4 rounded w-2/3" />
          <div className="skeleton h-3 rounded w-full" />
          <div className="skeleton h-3 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

function ProjectsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <FolderKanban className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold mb-2">No projects yet</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        Create your first project to start tracking issues, managing sprints, and building roadmaps.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
      >
        <Plus className="w-4 h-4" />
        Create your first project
      </button>
    </div>
  );
}
