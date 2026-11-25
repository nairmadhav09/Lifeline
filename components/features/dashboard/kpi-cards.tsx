"use client";

import { AlertCircle, CalendarClock, CheckCircle2, Wallet } from "lucide-react";
import { ProgressRing } from "@/components/features/dashboard/progress-ring";
import type { InstanceItem } from "@/lib/instances/types";
import { daysBetween, formatShortDate, relativeDay } from "@/lib/utils/dates";
import { formatMoney, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Props = {
  month: InstanceItem[];
  nextDue: InstanceItem | null;
  today: string;
  currency: string;
  monthlyBudget?: number | null;
};

export function KpiCards({ month, nextDue, today, currency, monthlyBudget = null }: Props) {
  const billable = month.filter((i) => i.status !== "skipped");
  const totalDue = billable.reduce((s, i) => s + i.amountDue, 0);
  const paidItems = billable.filter((i) => i.status === "paid");
  const paid = paidItems.reduce((s, i) => s + (i.amountPaid ?? i.amountDue), 0);
  const progress = totalDue > 0 ? Math.min(paid / totalDue, 1) : 0;
  const overdue = month.filter((i) => i.status === "overdue");
  const overdueSum = overdue.reduce((s, i) => s + i.amountDue, 0);
  const nextDays = nextDue ? daysBetween(today, nextDue.dueDate) : null;

  return (
    <section
      aria-label="This month at a glance"
      className="-mx-4 mb-6 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
    >
      <Kpi icon={Wallet} label="Due this month">
        <Amount>{formatMoney(totalDue, currency)}</Amount>
        <Meta>
          {pluralize(billable.length, "bill")}
          {monthlyBudget ? (
            totalDue > monthlyBudget ? (
              <span className="text-status-overdue">
                {" "}
                · {formatMoney(totalDue - monthlyBudget, currency)} over budget
              </span>
            ) : (
              <>
                {" "}
                · {Math.round((totalDue / monthlyBudget) * 100)}% of{" "}
                {formatMoney(monthlyBudget, currency)} budget
              </>
            )
          ) : null}
        </Meta>
      </Kpi>

      <Kpi icon={CheckCircle2} label="Paid so far">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Amount>{formatMoney(paid, currency)}</Amount>
            <Meta>
              {paidItems.length} of {billable.length} paid
            </Meta>
          </div>
          <div className="relative">
            <ProgressRing value={progress} label={`${Math.round(progress * 100)}% paid`} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
      </Kpi>

      <Kpi icon={AlertCircle} label="Overdue" tone={overdue.length > 0 ? "danger" : "default"}>
        <Amount className={cn(overdue.length > 0 && "text-status-overdue")}>
          {overdue.length}
        </Amount>
        <Meta>
          {overdue.length > 0 ? `${formatMoney(overdueSum, currency)} past due` : "You're on track"}
        </Meta>
      </Kpi>

      <Kpi icon={CalendarClock} label="Next due">
        {nextDue && nextDays !== null ? (
          <>
            <p className="truncate text-[15px] leading-8 font-semibold text-foreground">
              {nextDue.title}
              <span className="font-normal text-meta">
                {" "}
                · {relativeDay(nextDays).toLowerCase()}
              </span>
            </p>
            <Meta>
              {formatMoney(nextDue.amountDue, nextDue.currency)} ·{" "}
              {formatShortDate(nextDue.dueDate)}
            </Meta>
          </>
        ) : (
          <>
            <p className="text-[15px] leading-8 font-semibold text-foreground">All clear</p>
            <Meta>Nothing else due soon</Meta>
          </>
        )}
      </Kpi>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  tone = "default",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative min-w-[232px] shrink-0 snap-start overflow-hidden surface p-5 sm:min-w-0",
        tone === "danger" && "border-rose-200/70 dark:border-rose-500/25",
      )}
    >
      {tone === "danger" && (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-rose-500/70" />
      )}
      <p className="flex items-center gap-1.5 text-xs font-medium text-meta">
        <Icon
          className={cn("size-3.5", tone === "danger" ? "text-status-overdue" : "text-faint")}
        />
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Amount({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-2xl leading-8 font-semibold tracking-tight text-foreground tabular-nums",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 truncate text-xs text-meta tabular-nums">{children}</p>;
}
