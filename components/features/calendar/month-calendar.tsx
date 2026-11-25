"use client";

import { addDays, format, getDay, getDaysInMonth, parseISO } from "date-fns";
import { useRef } from "react";
import { STATUS_LABEL } from "@/lib/instances/status";
import type { InstanceItem } from "@/lib/instances/types";
import { formatMoneyShort, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { InstanceStatus } from "@/types/domain";

type Props = {
  period: string;
  today: string;
  items: InstanceItem[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  currency: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Most urgent first: what the dot order should say at a glance. */
const STATUS_ORDER: InstanceStatus[] = ["overdue", "due_soon", "upcoming", "paid", "skipped"];

export const STATUS_DOT: Record<InstanceStatus, string> = {
  overdue: "bg-status-overdue",
  due_soon: "bg-status-due-soon",
  upcoming: "bg-faint",
  paid: "bg-status-paid",
  skipped: "bg-status-skipped/50",
};

export function MonthCalendar({ period, today, items, selectedDate, onSelect, currency }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const first = parseISO(period);
  const daysInMonth = getDaysInMonth(first);
  const leading = getDay(first); // Sunday-first grid

  const byDate = new Map<string, InstanceItem[]>();
  for (const i of items) {
    const list = byDate.get(i.dueDate) ?? [];
    list.push(i);
    byDate.set(i.dueDate, list);
  }

  const dates = Array.from({ length: daysInMonth }, (_, d) =>
    format(addDays(first, d), "yyyy-MM-dd"),
  );
  // Roving tabindex: the selected day (or today, or the 1st) is the tab stop.
  const focusDate =
    selectedDate && dates.includes(selectedDate)
      ? selectedDate
      : dates.includes(today)
        ? today
        : dates[0];

  const moveFocus = (from: string, deltaDays: number) => {
    const idx = dates.indexOf(from) + deltaDays;
    const target = dates[Math.max(0, Math.min(dates.length - 1, idx))];
    if (!target) return;
    onSelect(target);
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus(),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent, date: string) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = deltas[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      moveFocus(date, delta);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(date, -dates.indexOf(date));
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(date, dates.length - 1 - dates.indexOf(date));
    }
  };

  return (
    <div>
      <div
        ref={gridRef}
        role="group"
        aria-label={`${format(first, "MMMM yyyy")}. Use arrow keys to move between days.`}
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
      >
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            aria-hidden="true"
            className="pb-1 text-center text-[11px] font-medium text-meta"
          >
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`pad-${i}`} aria-hidden="true" />
        ))}
        {dates.map((date) => {
          const dayItems = byDate.get(date) ?? [];
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const statuses = STATUS_ORDER.flatMap((s) =>
            dayItems.filter((i) => i.status === s).map(() => s),
          );
          const open = dayItems.filter((i) => i.status !== "paid" && i.status !== "skipped");
          const openTotal = open.reduce((s, i) => s + i.amountDue, 0);
          const label = `${format(parseISO(date), "EEEE, MMMM d")}${isToday ? " (today)" : ""}: ${
            dayItems.length === 0
              ? "nothing due"
              : `${pluralize(dayItems.length, "bill")}${summarize(dayItems)}`
          }`;

          return (
            <button
              key={date}
              type="button"
              data-date={date}
              tabIndex={date === focusDate ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => onSelect(date)}
              onKeyDown={(e) => onKeyDown(e, date)}
              className={cn(
                "@container relative flex min-h-12 flex-col items-center justify-start gap-1 rounded-xl p-1 text-sm transition-colors duration-150 ease-out sm:min-h-16 sm:items-start sm:p-2",
                "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                isSelected
                  ? "bg-accent text-accent-foreground ring-1 ring-primary/30"
                  : dayItems.length > 0
                    ? "bg-muted/50 hover:bg-muted"
                    : "hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-[13px] tabular-nums",
                  isToday ? "bg-brand-gradient font-semibold text-white" : "text-foreground",
                  !isToday && dayItems.length === 0 && "text-meta",
                )}
              >
                {Number(date.slice(8, 10))}
              </span>
              {dayItems.length > 0 && (
                <span
                  className="mt-auto flex w-full flex-col items-center gap-1 sm:items-start"
                  aria-hidden="true"
                >
                  <span className="flex flex-wrap justify-center gap-1 sm:justify-start">
                    {statuses.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className={cn("size-2 rounded-full ring-2 ring-card", STATUS_DOT[s])}
                      />
                    ))}
                    {statuses.length > 3 && (
                      <span className="text-[10px] leading-2 font-medium text-meta">
                        +{statuses.length - 3}
                      </span>
                    )}
                  </span>
                  {openTotal > 0 && (
                    <span className="hidden text-[11px] leading-4 font-medium text-body tabular-nums @[3.5rem]:block">
                      {formatMoneyShort(Math.round(openTotal), currency)}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend: status dots never carry meaning alone. */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-meta" aria-label="Legend">
        {(["overdue", "due_soon", "upcoming", "paid"] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", STATUS_DOT[s])} aria-hidden="true" />
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function summarize(items: InstanceItem[]): string {
  const counts = STATUS_ORDER.map(
    (s) => [s, items.filter((i) => i.status === s).length] as const,
  ).filter(([, n]) => n > 0);
  return counts.length
    ? ` (${counts.map(([s, n]) => `${n} ${STATUS_LABEL[s].toLowerCase()}`).join(", ")})`
    : "";
}
