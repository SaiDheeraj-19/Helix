"use client";

import { Video } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center text-muted-foreground animate-fade-in">
      <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
        <Video className="w-8 h-8 text-zinc-500" />
      </div>
      <h2 className="text-xl font-medium text-foreground">Meetings</h2>
      <p className="max-w-md text-sm">
        Connect your calendar to sync meetings and generate automated AI notes directly within your workspace.
        This feature is coming soon to the platform.
      </p>
    </div>
  );
}
