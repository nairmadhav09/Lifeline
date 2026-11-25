"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, monthParam, shiftPeriod } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

export function MonthSwitcher({
  period,
  currentPeriod,
  basePath = "/dashboard",
}: {
  period: string;
  currentPeriod: string;
  basePath?: "/dashboard" | "/calendar" | "/insights";
}) {
  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const isCurrent = period === currentPeriod;
  const href = (p: string) =>
    (p === currentPeriod ? basePath : `${basePath}?month=${monthParam(p)}`) as Route;

  return (
    <nav aria-label="Month" className="flex items-center gap-2">
      {!isCurrent && (
        <Button variant="ghost" size="sm" asChild className="text-meta">
          <Link href={basePath}>This month</Link>
        </Button>
      )}
      <div className="flex h-9 items-center gap-0.5 surface rounded-xl px-1 shadow-none">
        <Button variant="ghost" size="icon-xs" asChild>
          <Link
            href={href(prev)}
            aria-label={`Previous month, ${formatMonthLabel(prev)}`}
            scroll={false}
          >
            <ChevronLeft />
          </Link>
        </Button>
        <span
          aria-live="polite"
          className={cn(
            "min-w-[124px] text-center text-sm font-medium tabular-nums",
            isCurrent ? "text-foreground" : "text-primary",
          )}
        >
          {formatMonthLabel(period)}
        </span>
        <Button variant="ghost" size="icon-xs" asChild>
          <Link
            href={href(next)}
            aria-label={`Next month, ${formatMonthLabel(next)}`}
            scroll={false}
          >
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </nav>
  );
}
