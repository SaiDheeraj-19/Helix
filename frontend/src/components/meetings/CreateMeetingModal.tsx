"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export function CreateMeetingModal() {
  const { createMeetingOpen, createMeetingProjectId, closeCreateMeeting } = useUIStore();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [externalEmails, setExternalEmails] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const emails = externalEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const attendees = emails.map((email) => ({ external_email: email }));

      return api.post(`/projects/${createMeetingProjectId}/meetings`, {
        title,
        attendees,
      });
    },
    onSuccess: () => {
      toast.success("Meeting created successfully");
      queryClient.invalidateQueries({ queryKey: ["meetings", createMeetingProjectId] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create meeting");
    },
  });

  const handleClose = () => {
    setTitle("");
    setExternalEmails("");
    closeCreateMeeting();
  };

  if (!createMeetingOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={cn(
          "relative w-full max-w-lg bg-[#0F0F0F] rounded-xl border border-[rgba(255,255,255,0.1)]",
          "shadow-2xl overflow-hidden flex flex-col"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-white/50" />
            <h2 className="text-[14px] font-medium text-white/90">New Meeting</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-medium text-white/60 mb-1.5">Meeting Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning, Design Review..."
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-md text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-white/60 mb-1.5">
              Invite External Guests (Admin Only)
            </label>
            <input
              value={externalEmails}
              onChange={(e) => setExternalEmails(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-md text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <p className="text-[11px] text-white/40 mt-1.5">
              Only workspace admins can invite external participants to Jitsi rooms.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0A0A0A]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={!title || isPending}
            className="flex items-center justify-center min-w-[80px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
