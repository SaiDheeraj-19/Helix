"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Draggable from "react-draggable";
import { Plus, Trash2, PenTool } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { projectsApi } from "@/lib/api";
import { useProjectWebSocket } from "@/hooks/useWebSocket";

const WORKSPACE_SLUG = "default";

export default function WhiteboardPage() {
  const params = useParams();
  const projectIdentifier = params?.identifier as string;
  const queryClient = useQueryClient();

  const { data: projectData } = useQuery({
    queryKey: ["project", WORKSPACE_SLUG, projectIdentifier],
    queryFn: () => projectsApi.get(WORKSPACE_SLUG, projectIdentifier),
    enabled: !!projectIdentifier,
  });
  const project = projectData?.data;

  const { data: notesData } = useQuery({
    queryKey: ["notes", project?.id],
    queryFn: () => api.get(`/projects/${project!.id}/notes`),
    enabled: !!project?.id,
  });
  const notes = (notesData?.data as any[]) || [];

  // Hook into Realtime Sync for notes
  useProjectWebSocket(project?.id || null);

  const createNote = useMutation({
    mutationFn: () =>
      api.post(`/projects/${project!.id}/notes`, {
        content: "New note...",
        position_x: Math.random() * 200 + 100,
        position_y: Math.random() * 200 + 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", project?.id] });
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", project?.id] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", project?.id] });
    },
  });

  const handleDragStop = (e: any, data: any, noteId: string) => {
    // Only fire API update if it actually moved significantly
    updateNote.mutate({
      id: noteId,
      data: { position_x: data.x, position_y: data.y },
    });
  };

  return (
    <div className="relative w-full h-full bg-[#111111] overflow-hidden" 
         style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      
      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-full shadow-2xl z-50">
        <button
          onClick={() => createNote.mutate()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sticky
        </button>
      </div>

      {/* Canvas */}
      <div className="w-full h-full relative">
        {notes.map((note: any) => (
          <Draggable
            key={note.id}
            defaultPosition={{ x: note.position_x, y: note.position_y }}
            onStop={(e, data) => handleDragStop(e, data, note.id)}
            bounds="parent"
            handle=".drag-handle"
          >
            <div
              className="absolute w-48 shadow-xl rounded-md border border-black/10 overflow-hidden flex flex-col group"
              style={{ backgroundColor: note.color, minHeight: '120px' }}
            >
              {/* Header (Drag Handle) */}
              <div className="drag-handle h-6 w-full bg-black/5 hover:bg-black/10 cursor-move flex items-center justify-between px-2 transition-colors">
                <PenTool className="w-3 h-3 text-black/40" />
                <button 
                  onClick={() => deleteNote.mutate(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/10 rounded text-black/50 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              {/* Body */}
              <textarea
                className="flex-1 w-full bg-transparent p-3 text-[13px] text-black/80 font-medium placeholder-black/30 resize-none focus:outline-none"
                defaultValue={note.content}
                onBlur={(e) => {
                  if (e.target.value !== note.content) {
                    updateNote.mutate({ id: note.id, data: { content: e.target.value } });
                  }
                }}
                placeholder="Type here..."
              />
            </div>
          </Draggable>
        ))}
      </div>
    </div>
  );
}
