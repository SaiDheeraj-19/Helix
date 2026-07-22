import { Signal, SignalHigh, SignalMedium, SignalLow, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function IssuePriorityIcon({ priority, size = "sm", className }: {
  priority: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const normalized = priority?.toLowerCase() || "none";
  
  switch (normalized) {
    case "urgent":
      return <Signal className={cn("text-red-500", sizeClass(size), className)} />;
    case "high":
      return <SignalHigh className={cn("text-orange-500", sizeClass(size), className)} />;
    case "medium":
      return <SignalMedium className={cn("text-amber-500", sizeClass(size), className)} />;
    case "low":
      return <SignalLow className={cn("text-blue-500", sizeClass(size), className)} />;
    default:
      return <Minus className={cn("text-muted-foreground", sizeClass(size), className)} />;
  }
}

function sizeClass(size: "xs" | "sm" | "md") {
  if (size === "xs") return "w-3 h-3";
  if (size === "sm") return "w-4 h-4";
  return "w-5 h-5";
}
