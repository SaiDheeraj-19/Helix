"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Bell, Palette, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/settings/profile", icon: User },
      { label: "Preferences", href: "/settings/preferences", icon: Palette },
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "General", href: "/settings/workspace", icon: Building2 },
      { label: "Members", href: "/settings/workspace/members", icon: User },
      { label: "Billing", href: "/settings/workspace/billing", icon: CreditCard },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 overflow-y-auto hidden md:block">
        <div className="px-4 py-6">
          <h2 className="text-lg font-bold mb-6 px-2">Settings</h2>
          
          <div className="space-y-6">
            {SETTINGS_NAV.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {group.title}
                </h3>
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors font-medium",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
