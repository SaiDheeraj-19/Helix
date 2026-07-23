"use client";

import { StickyNote } from "lucide-react";

export default function StickyNotesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center text-muted-foreground animate-fade-in">
      <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
        <StickyNote className="w-8 h-8 text-zinc-500" />
      </div>
      <h2 className="text-xl font-medium text-foreground">Sticky Notes</h2>
      <p className="max-w-md text-sm">
        A personal canvas for your quick thoughts and ideas. 
        This feature is currently under development.
      </p>
    </div>
  );
}
