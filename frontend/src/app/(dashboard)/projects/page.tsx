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
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace.store";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

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
  cover_image: z.string().optional(),
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const queryClient = useQueryClient();
  const { currentWorkspaceSlug: WORKSPACE_SLUG } = useWorkspaceStore();

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

  const [coverUrl, setCoverUrl] = useState("https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&h=400");
  const [isFetchingCover, setIsFetchingCover] = useState(false);

  const fetchRandomCover = async () => {
    try {
      setIsFetchingCover(true);
      const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";
      const res = await fetch(`https://api.unsplash.com/photos/random?query=landscape,abstract,dark,nature&orientation=landscape&client_id=${accessKey}`);
      if (res.ok) {
        const data = await res.json();
        setCoverUrl(data.urls.regular);
      } else {
        toast.error("Unsplash API rate limit reached or error occurred.");
      }
    } catch (err) {
      console.error("Failed to fetch Unsplash cover", err);
    } finally {
      setIsFetchingCover(false);
    }
  };

// ... (skipping some unchanged lines in mind)
// wait, I need to replace the entire block from line 133 to 186
  
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
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  className="w-full max-w-[720px] rounded-xl border border-border/50 bg-[#151515] shadow-2xl overflow-hidden"
                >
                  <form
                    onSubmit={handleSubmit((d) => createMutation.mutate(d))}
                    className="flex flex-col"
                  >
                    {/* Cover Photo Area */}
                    <div className="relative h-[200px] w-full bg-muted overflow-hidden group">
                      <img 
                        src={coverUrl} 
                        alt="Cover" 
                        className={cn("w-full h-full object-cover transition-opacity duration-300", isFetchingCover && "opacity-50 blur-sm grayscale")} 
                      />
                      
                      <Dialog.Close asChild>
                        <button type="button" className="absolute top-4 right-4 p-1.5 rounded-md bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors backdrop-blur-md">
                          <X className="w-4 h-4" />
                        </button>
                      </Dialog.Close>

                      <div className="absolute bottom-4 left-6 flex items-center justify-center w-8 h-8 rounded-md bg-black/40 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-black/60 transition-colors text-white/80">
                        <span className="text-sm">✨</span>
                      </div>

                      <button
                        type="button"
                        onClick={fetchRandomCover}
                        disabled={isFetchingCover}
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 text-white/90 text-xs font-medium border border-white/10 backdrop-blur-md hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100"
                      >
                        {isFetchingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {isFetchingCover ? "Searching..." : "Change cover"}
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Project Name and ID Row */}
                      <div className="grid grid-cols-[1fr,200px] gap-3">
                        <div className="relative">
                          <input
                            {...register("name")}
                            placeholder="Project name"
                            className="w-full px-3 py-2.5 rounded-md border border-[#2b2b2b] bg-[#1e1e1e] text-sm focus:outline-none focus:border-[#404040] transition-all text-white placeholder:text-white/30"
                            autoFocus
                          />
                        </div>
                        <div className="relative">
                          <input
                            {...register("identifier")}
                            placeholder={autoIdentifier || "FRT"}
                            className="w-full px-3 py-2.5 rounded-md border border-[#2b2b2b] bg-[#1e1e1e] text-sm font-mono uppercase focus:outline-none focus:border-[#404040] transition-all pr-8 text-white placeholder:text-white/30"
                            onChange={(e) => {
                              e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                              register("identifier").onChange(e);
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">
                            ID
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="relative">
                        <textarea
                          {...register("description")}
                          placeholder="Description"
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-md border border-[#2b2b2b] bg-[#1e1e1e] text-sm resize-none focus:outline-none focus:border-[#404040] transition-all text-white placeholder:text-white/30"
                        />
                        <div className="absolute bottom-2 right-2">
                          <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                        </div>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between pt-4">
                        {/* Network / Visibility */}
                        <div className="flex items-center gap-2">
                          {(["public", "secret", "private"] as const).map((n) => {
                            const cfg = networkConfig[n];
                            const isSelected = watch("network") === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setValue("network", n)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all",
                                  isSelected
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
                                )}
                              >
                                <cfg.icon className="w-3.5 h-3.5" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Submit */}
                        <div className="flex items-center gap-2">
                          <Dialog.Close asChild>
                            <button
                              type="button"
                              className="px-4 py-2 text-sm font-medium rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              Cancel
                            </button>
                          </Dialog.Close>
                          <button
                            type="submit"
                            disabled={isSubmitting || createMutation.isPending}
                            className="px-4 py-2 text-sm text-white font-medium rounded bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 transition-colors shadow-sm"
                          >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create project"}
                          </button>
                        </div>
                      </div>
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
