"use client";

import { AlertCircle, Bell, BellRing, Clock, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationItem } from "@/lib/data/notifications";
import { daysBetween, formatShortDate, relativeDay } from "@/lib/utils/dates";
import { formatMoney, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** In-app reminders: overdue bills and anything due in the next 7 days. */
export function NotificationBell({ items, today }: { items: NotificationItem[]; today: string }) {
  const [open, setOpen] = useState(false);
  const overdue = items.filter((i) => i.status === "overdue");
  const upcoming = items.filter((i) => i.status !== "overdue");
  const urgent = overdue.length + items.filter((i) => i.status === "due_soon").length;
  const label =
    urgent > 0 ? `Notifications: ${pluralize(urgent, "bill")} need attention` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative text-meta">
          <Bell className="size-[18px]" aria-hidden="true" />
          {urgent > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white tabular-nums ring-2 ring-background",
                overdue.length > 0 ? "bg-rose-500" : "bg-amber-500",
              )}
            >
              {urgent > 9 ? "9+" : urgent}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl p-0 shadow-pop"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Reminders</p>
          <p className="text-xs text-meta">Next 7 days</p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-status-paid-bg text-status-paid">
              <BellRing className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-meta">Nothing is overdue or due in the next 7 days.</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto py-1">
            {overdue.length > 0 && (
              <Group
                title="Overdue"
                items={overdue}
                today={today}
                onNavigate={() => setOpen(false)}
              />
            )}
            {upcoming.length > 0 && (
              <Group
                title="Coming up"
                items={upcoming}
                today={today}
                onNavigate={() => setOpen(false)}
              />
            )}
          </div>
        )}

        <div className="border-t px-4 py-2.5">
          <Link
            href="/calendar"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Open calendar
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Group({
  title,
  items,
  today,
  onNavigate,
}: {
  title: string;
  items: NotificationItem[];
  today: string;
  onNavigate: () => void;
}) {
  return (
    <section aria-label={title}>
      <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-meta uppercase">
        {title}
      </p>
      <ul>
        {items.map((i) => {
          const days = daysBetween(today, i.dueDate);
          const isOverdue = i.status === "overdue";
          return (
            <li key={i.id}>
              <Link
                href="/dashboard"
                onClick={onNavigate}
                className="flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
                    isOverdue
                      ? "bg-status-overdue-bg text-status-overdue"
                      : "bg-status-due-soon-bg text-status-due-soon",
                  )}
                  aria-hidden="true"
                >
                  {isOverdue ? (
                    <AlertCircle className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{i.title}</span>
                    {i.autopay && (
                      <Repeat2 className="size-3 shrink-0 text-faint" aria-label="Autopay" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "block text-xs tabular-nums",
                      isOverdue ? "text-status-overdue" : "text-meta",
                    )}
                  >
                    {isOverdue ? `${Math.abs(days)} days overdue` : relativeDay(days)} ·{" "}
                    {formatShortDate(i.dueDate)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatMoney(i.amount, i.currency)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
