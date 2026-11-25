import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

/** All calendar dates in the app are plain `yyyy-MM-dd` strings (no time, no zone). */
export type ISODate = string;

/** Today's calendar date in an IANA timezone, e.g. "2026-11-25". */
export function todayInTz(timeZone: string, now: Date = new Date()): ISODate {
  try {
    // en-CA formats as yyyy-MM-dd.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function hourInTz(timeZone: string, now: Date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now);
    return Number(h);
  } catch {
    return now.getHours();
  }
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** First day of the month containing `date`. */
export function periodOf(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function shiftPeriod(period: ISODate, months: number): ISODate {
  return format(addMonths(parseISO(period), months), "yyyy-MM-01");
}

/** `?month=2026-11` → "2026-11-01", or null if malformed. */
export function periodFromMonthParam(value: string | undefined | null): ISODate | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return `${value}-01`;
}

export function monthParam(period: ISODate): string {
  return period.slice(0, 7);
}

export function formatMonthLabel(period: ISODate): string {
  return format(parseISO(period), "MMMM yyyy");
}

export function formatShortDate(date: ISODate): string {
  return format(parseISO(date), "MMM d");
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

/** "Today", "Tomorrow", "in 4 days", "Yesterday", "3 days ago". */
export function relativeDay(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil === -1) return "Yesterday";
  if (daysUntil > 1) return `in ${daysUntil} days`;
  return `${Math.abs(daysUntil)} days ago`;
}
