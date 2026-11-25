import { daysBetween, type ISODate } from "@/lib/utils/dates";
import type { InstanceItem } from "@/lib/instances/types";
import type { InstanceStatus } from "@/types/domain";

/** Days before the due date at which an item counts as "due soon". Mirrors the SQL view. */
export const DUE_SOON_DAYS = 3;

/**
 * Same rule as the task_instance_details view, for optimistic updates on
 * the client (e.g. undoing "Mark paid" must restore overdue vs upcoming).
 */
export function deriveOpenStatus(dueDate: ISODate, today: ISODate): InstanceStatus {
  const days = daysBetween(today, dueDate);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "upcoming";
}

export function isOpen(status: InstanceStatus): boolean {
  return status !== "paid" && status !== "skipped";
}

export type GroupKey = "overdue" | "this_week" | "upcoming" | "done";

export const GROUPS: readonly { key: GroupKey; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "this_week", label: "Due this week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Paid" },
];

export function groupOf(item: InstanceItem, today: ISODate): GroupKey {
  if (!isOpen(item.status)) return "done";
  if (item.status === "overdue") return "overdue";
  return daysBetween(today, item.dueDate) <= 7 ? "this_week" : "upcoming";
}

export const STATUS_LABEL: Record<InstanceStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  overdue: "Overdue",
  paid: "Paid",
  skipped: "Skipped",
};
