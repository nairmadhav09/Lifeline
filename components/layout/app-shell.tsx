"use client";

import { useCallback, useState } from "react";
import { TaskSheetProvider } from "@/components/features/tasks/task-sheet-provider";
import type { NotificationItem } from "@/lib/data/notifications";
import type { CategoryRef } from "@/lib/instances/types";
import { CommandMenu } from "@/components/layout/command-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import type { ShellUser } from "@/components/layout/types";
import { cn } from "@/lib/utils";

type Props = {
  user: ShellUser;
  defaultCollapsed: boolean;
  categories: CategoryRef[];
  currency: string;
  today: string;
  notifications: NotificationItem[];
  children: React.ReactNode;
};

export function AppShell({
  user,
  defaultCollapsed,
  categories,
  currency,
  today,
  notifications,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [commandOpen, setCommandOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      // Persist so the server renders the same width on the next load (no flash).
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  return (
    <TaskSheetProvider categories={categories} currency={currency} today={today}>
      <div className="min-h-dvh bg-page-wash">
        <a
          href="#main"
          className="sr-only z-[60] rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>

        <Sidebar user={user} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

        <div
          className={cn(
            "flex min-h-dvh flex-col transition-[padding] duration-200 ease-out",
            collapsed ? "md:pl-[72px]" : "md:pl-[248px]",
          )}
        >
          <TopBar
            user={user}
            notifications={notifications}
            today={today}
            onOpenCommand={() => setCommandOpen(true)}
          />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 md:pt-8 md:pb-16 lg:px-8"
          >
            {children}
          </main>
        </div>

        <MobileNav />
        <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </TaskSheetProvider>
  );
}
