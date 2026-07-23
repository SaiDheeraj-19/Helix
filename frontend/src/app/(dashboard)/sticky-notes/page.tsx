"use client";

import { useQuery } from "@tanstack/react-query";
import { StickyNote as StickyNoteIcon, Loader2, Calendar } from "lucide-react";
import { api } from "@/lib/api-client";
import { format } from "date-fns";

interface StickyNote {
  id: string;
  project_id: string;
  content: string;
  color: string;
  created_at?: string;
}

export default function StickyNotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notes", "me"],
    queryFn: () => api.get<StickyNote[]>("/users/me/notes"),
  });

  const notes = data?.data || [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-background)]">
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">My Sticky Notes</h1>
          <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
            All your notes across all projects in one place.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-[var(--color-foreground-muted)] text-sm">Loading your notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--color-surface)]">
              <StickyNoteIcon className="w-8 h-8 text-[var(--color-foreground-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-foreground)]">No notes found</h3>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              You haven't created any sticky notes yet. Create them inside your project whiteboards!
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {notes.map((note) => (
              <div 
                key={note.id}
                className="break-inside-avoid relative flex flex-col p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: note.color || "#FEF3C7" }}
              >
                <p className="text-gray-900 whitespace-pre-wrap font-medium leading-relaxed">
                  {note.content}
                </p>
                {note.created_at && (
                  <div className="mt-4 flex items-center space-x-1.5 text-xs text-gray-700/60 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(note.created_at), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
