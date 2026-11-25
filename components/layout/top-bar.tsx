"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { ShellUser } from "@/components/layout/types";
import type { NotificationItem } from "@/lib/data/notifications";
import { UserMenu } from "@/components/layout/user-menu";

type Props = {
  user: ShellUser;
  onOpenCommand: () => void;
  notifications: NotificationItem[];
  today: string;
};

export function TopBar({ user, onOpenCommand, notifications, today }: Props) {
  const isMac = useIsMac();

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          aria-label="Lifeline home"
          className="rounded-lg focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none md:hidden"
        >
          <LogoMark />
        </Link>

        {/* Search / ⌘K trigger — styled as an input so it reads as "type here". */}
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Search or run a command"
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-input bg-card/80 px-3 text-left text-sm text-faint shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:max-w-[420px] dark:hover:border-slate-600"
        >
          <Search className="size-4 shrink-0 text-meta" aria-hidden="true" />
          <span className="truncate text-meta">Search or add a task…</span>
          <kbd className="ml-auto hidden h-5 items-center gap-0.5 rounded-md border bg-muted px-1.5 font-sans text-[11px] font-medium text-meta sm:inline-flex">
            {isMac ? "⌘" : "Ctrl"}
            <span>K</span>
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationBell items={notifications} today={today} />
          <div className="md:hidden">
            <UserMenu user={user} compact />
          </div>
        </div>
      </div>
    </header>
  );
}

function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform is only known on the client
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  return isMac;
}
