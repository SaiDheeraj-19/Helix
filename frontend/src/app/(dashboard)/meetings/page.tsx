"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Video, Calendar as CalendarIcon, Users, ExternalLink, Link as LinkIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { getInitials, getUserColor } from "@/lib/utils";

interface Meeting {
  id: string;
  title: string;
  room_slug: string;
  created_at: string;
  attendees: Array<{ user: { id: string; display_name: string; email: string }; role: string }>;
}

export default function MeetingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["meetings", "me"],
    queryFn: () => api.get<Meeting[]>("/users/me/meetings"),
  });

  const meetings = data?.data || [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-background)]">
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Upcoming Meetings</h1>
          <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
            Join and manage your scheduled video syncs.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-[var(--color-foreground-muted)] text-sm">Loading your meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-4">
            <div className="p-4 rounded-full bg-[var(--color-surface)]">
              <Video className="w-8 h-8 text-[var(--color-foreground-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-foreground)]">No meetings scheduled</h3>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              You don&apos;t have any upcoming meetings. Meetings created inside your projects will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <div 
                key={meeting.id}
                className="group relative flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-[var(--color-primary)] transition-all duration-200"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-md">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{format(new Date(meeting.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 line-clamp-2">
                    {meeting.title}
                  </h3>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <div className="flex -space-x-2">
                      {meeting.attendees?.slice(0, 4).map((att, i) => (
                        <div 
                          key={att.user.id} 
                          className="w-7 h-7 rounded-full border-2 border-[var(--color-surface)] flex items-center justify-center text-[10px] font-medium text-white"
                          style={{ backgroundColor: getUserColor(att.user.id) }}
                        >
                          {getInitials(att.user.display_name)}
                        </div>
                      ))}
                      {meeting.attendees?.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-surface)] flex items-center justify-center text-[10px] font-medium text-[var(--color-foreground)]">
                          +{meeting.attendees.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-foreground-muted)] font-medium">
                      {meeting.attendees?.length || 0} participants
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/50 flex items-center gap-3">
                  <a 
                    href={`https://meet.jit.si/${meeting.room_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Video className="w-4 h-4" />
                    Join Meeting
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`https://meet.jit.si/${meeting.room_slug}`);
                    }}
                    className="p-2 border border-[var(--color-border)] rounded-lg text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
