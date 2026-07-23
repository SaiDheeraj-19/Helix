"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutList, Video, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectLayout({ children, params }: { children: React.ReactNode, params: any }) {
  const pathname = usePathname();
  const identifier = params?.identifier as string;

  if (!identifier) return <>{children}</>;

  const basePath = `/projects/${identifier}`;

  const tabs = [
    { name: "Issues", href: `${basePath}/issues`, icon: LayoutList },
    { name: "Whiteboard", href: `${basePath}/whiteboard`, icon: PenTool },
    { name: "Meetings", href: `${basePath}/meetings`, icon: Video },
  ];

  // We inject this secondary nav on top of whatever page is rendered
  return (
    <div className="flex flex-col h-full bg-[#090909]">
      <div className="flex items-center gap-6 px-6 h-12 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0 bg-[#090909]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 h-full border-b-2 text-[13px] font-medium transition-colors",
                isActive 
                  ? "border-blue-500 text-white" 
                  : "border-transparent text-white/50 hover:text-white/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </Link>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
