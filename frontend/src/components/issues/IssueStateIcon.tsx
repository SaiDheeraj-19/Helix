import { CircleDot, Clock, Play, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueState } from "@/types";

export function IssueStateIcon({ state, size = "sm", className }: {
  state: IssueState | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  if (!state) {
    return <CircleDot className={cn("text-muted-foreground", sizeClass(size), className)} />;
  }

  const color = state.color || "#6b7280";
  
  switch (state.group) {
    case "backlog":
      return <CircleDot className={cn(sizeClass(size), className)} style={{ color }} />;
    case "unstarted":
      return <Clock className={cn(sizeClass(size), className)} style={{ color }} />;
    case "started":
      return <Play className={cn(sizeClass(size), className)} style={{ color }} fill={color} fillOpacity={0.2} />;
    case "completed":
      return <CheckCircle2 className={cn(sizeClass(size), className)} style={{ color }} />;
    case "cancelled":
      return <XCircle className={cn(sizeClass(size), className)} style={{ color }} />;
    default:
      return <CircleDot className={cn(sizeClass(size), className)} style={{ color }} />;
  }
}

function sizeClass(size: "xs" | "sm" | "md") {
  if (size === "xs") return "w-3 h-3";
  if (size === "sm") return "w-4 h-4";
  return "w-5 h-5";
}
