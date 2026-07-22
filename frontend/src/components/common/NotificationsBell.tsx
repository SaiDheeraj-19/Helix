"use client";

/**
 * Helix — Notifications Bell + Panel
 * Shows unread count badge and a slide-over panel with notification list.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, CheckCheck, Loader2, CircleDot, MessageSquare, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api-client";
import { formatRelativeDate, cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

function notificationIcon(type: string) {
  switch (type) {
    case "issue_assigned": return <CircleDot className="w-4 h-4 text-blue-500" />;
    case "comment_added": return <MessageSquare className="w-4 h-4 text-amber-500" />;
    case "invitation": return <UserPlus className="w-4 h-4 text-green-500" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => api.get<{ count: number }>("/api/v1/notifications/unread-count"),
    refetchInterval: 30_000,
  });
  const unreadCount = (countData?.data as any)?.count ?? 0;

  const { data: notifData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationItem[]>("/api/v1/notifications"),
    enabled: open,
  });
  const notifications: NotificationItem[] = (notifData?.data as any) || [];

  const markAllMutation = useMutation({
    mutationFn: () => api.post("/api/v1/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "count"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "count"] });
    },
  });

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-primary text-white rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 16, y: -4 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 16, y: -4 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed top-14 right-3 z-50 w-80 max-h-[480px] rounded-xl border border-border bg-popover shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllMutation.mutate()}
                      title="Mark all as read"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => !n.is_read && markOneMutation.mutate(n.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors",
                          !n.is_read && "bg-primary/3"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {notificationIcon(n.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs leading-relaxed",
                            n.is_read ? "text-muted-foreground" : "text-foreground font-medium"
                          )}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatRelativeDate(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
