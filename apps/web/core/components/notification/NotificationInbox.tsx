'use client';

import { Inbox } from "@novu/nextjs";
import { useUser } from "@/hooks/store/user";

export default function NotificationInbox({ subscriberId }: { subscriberId?: string }) {
  const { data: currentUser } = useUser();
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
  const currentSubscriberId = currentUser?.id || subscriberId || "6a609710eb33bba3b8cd63da";
  const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL;
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL;

  if (!applicationIdentifier) {
    return null;
  }

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={currentSubscriberId}
      {...(backendUrl ? { backendUrl } : {})}
      {...(socketUrl ? { socketUrl } : {})}
      appearance={{
        variables: {
          colorPrimary: "var(--color-primary-500, #3b82f6)",
          colorBackground: "var(--color-bg-canvas, #0f172a)",
          colorForeground: "var(--color-text-primary, #f8fafc)",
        },
      }}
    />
  );
}
