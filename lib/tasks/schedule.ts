import { format, getDaysInMonth, parseISO } from "date-fns";
import { periodOf, shiftPeriod, type ISODate } from "@/lib/utils/dates";
import type { Recurrence } from "@/types/domain";

/**
 * Client-side mirror of the SQL schedule helpers (task_occurs_in,
 * instance_due_date, generate_task_instances) so forms can preview dates.
 */
export type Schedule = {
  recurrence: Recurrence;
  dueDay: number;
  dueMonth: number | null;
  startDate: ISODate;
  endDate: ISODate | null;
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Every 6 months",
  yearly: "Yearly",
  one_time: "One time",
};

const monthOf = (d: ISODate) => Number(d.slice(5, 7));

export function occursIn(s: Schedule, period: ISODate): boolean {
  const m = monthOf(period);
  const anchor = s.dueMonth ?? monthOf(s.startDate);
  switch (s.recurrence) {
    case "monthly":
      return true;
    case "quarterly":
      return (((m - anchor) % 3) + 3) % 3 === 0;
    case "half_yearly":
      return (((m - anchor) % 6) + 6) % 6 === 0;
    case "yearly":
      return m === anchor;
    case "one_time":
      return periodOf(s.startDate) === period;
  }
}

/** Day 31 clamps to the month's last day, as in SQL. */
export function dueDateFor(period: ISODate, dueDay: number): ISODate {
  const day = Math.min(dueDay, getDaysInMonth(parseISO(period)));
  return `${period.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

/** The next `count` due dates on or after `from`. */
export function upcomingDueDates(s: Schedule, from: ISODate, count = 3): ISODate[] {
  const out: ISODate[] = [];
  const begin = from > s.startDate ? from : s.startDate;
  let period = periodOf(begin);
  for (let i = 0; i < 72 && out.length < count; i++, period = shiftPeriod(period, 1)) {
    if (!occursIn(s, period)) continue;
    const due = dueDateFor(period, s.dueDay);
    if (due < begin) continue;
    if (s.endDate && due > s.endDate) break;
    out.push(due);
    if (s.recurrence === "one_time") break;
  }
  return out;
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

const monthName = (m: number) => format(new Date(2000, m - 1, 1), "MMM");

/** "Monthly on the 15th", "Quarterly · Jan, Apr, Jul, Oct on the 15th", "Yearly on Mar 3". */
export function describeSchedule(s: Schedule): string {
  const anchor = s.dueMonth ?? monthOf(s.startDate);
  switch (s.recurrence) {
    case "monthly":
      return `Monthly on the ${ordinal(s.dueDay)}`;
    case "quarterly": {
      const months = [0, 3, 6, 9].map((o) => ((anchor - 1 + o) % 12) + 1).sort((a, b) => a - b);
      return `Quarterly · ${months.map(monthName).join(", ")} on the ${ordinal(s.dueDay)}`;
    }
    case "half_yearly": {
      const months = [0, 6].map((o) => ((anchor - 1 + o) % 12) + 1).sort((a, b) => a - b);
      return `Every 6 months · ${months.map(monthName).join(" & ")} on the ${ordinal(s.dueDay)}`;
    }
    case "yearly":
      return `Yearly on ${monthName(anchor)} ${s.dueDay}`;
    case "one_time":
      return `Once on ${format(parseISO(s.startDate), "MMM d, yyyy")}`;
  }
}
