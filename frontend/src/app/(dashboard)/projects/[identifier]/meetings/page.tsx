"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { Loader2, Video, Plus, Users, Shield, ShieldAlert, ArrowLeft } from "lucide-react";

import { projectsApi } from "@/lib/api";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";

const WORKSPACE_SLUG = "default";

export default function MeetingsPage() {
  const params = useParams();
  const projectIdentifier = params?.identifier as string;
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null);

  // Fetch project
  const { data: projectData } = useQuery({
    queryKey: ["project", WORKSPACE_SLUG, projectIdentifier],
    queryFn: () => projectsApi.get(WORKSPACE_SLUG, projectIdentifier),
    enabled: !!projectIdentifier,
  });
  const project = projectData?.data;

  // Fetch meetings
  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ["meetings", project?.id],
    queryFn: () => api.get(`/projects/${project!.id}/meetings`),
    enabled: !!project?.id,
  });
  const meetings = (meetingsData?.data as any[]) || [];

  if (activeMeeting) {
    const meeting = meetings.find((m: any) => m.room_slug === activeMeeting);
    return (
      <div className="flex flex-col h-full bg-[#090909] text-white">
        <div className="flex items-center gap-3 px-6 h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0 bg-[#090909]">
          <button
            onClick={() => setActiveMeeting(null)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-400" />
            <h1 className="text-[14px] font-medium">{meeting?.title || "Meeting"}</h1>
          </div>
        </div>
        <div className="flex-1 bg-black">
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={activeMeeting}
            configOverwrite={{
              startWithAudioMuted: true,
              disableModeratorIndicator: true,
              startScreenSharing: true,
              enableEmailInStats: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            userInfo={{
              displayName: "Helix User",
              email: "user@helix.app"
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = "100%";
              iframeRef.style.width = "100%";
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#090909] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-white/50" />
          <h1 className="text-[14px] font-medium">Meetings</h1>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => useUIStore.getState().openCreateMeeting(project?.id || "")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-gray-200 transition-colors rounded-md text-[13px] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New Meeting
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Video className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-[14px] text-white/60 mb-1">No meetings yet</p>
            <p className="text-[13px] text-white/40">Start an instant meeting with your team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111111] hover:border-[rgba(255,255,255,0.1)] transition-colors group cursor-pointer"
                onClick={() => setActiveMeeting(meeting.room_slug)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Video className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-white/90">{meeting.title}</h3>
                      <p className="text-[12px] text-white/40">{new Date(meeting.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded bg-white/5 text-white/60">
                    {meeting.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-white/40 mt-4">
                  <Users className="w-3.5 h-3.5" />
                  <span>{meeting.attendees?.length || 0} participants invited</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
