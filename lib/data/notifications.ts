import "server-only";

import { createClient } from "@/lib/supabase/server";
import { addDaysISO } from "@/lib/utils/dates";
import type { InstanceStatus } from "@/types/domain";

export type NotificationItem = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: InstanceStatus;
  autopay: boolean;
};

/** Open bills that are overdue or due within the next 7 days, most urgent first. */
export async function getNotifications(today: string): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instance_details")
    .select("id, title, due_date, amount_due, currency, status, autopay")
    .eq("task_is_archived", false)
    .in("status", ["overdue", "due_soon", "upcoming"])
    .lte("due_date", addDaysISO(today, 7))
    .order("due_date")
    .limit(25);
  if (error) {
    console.error("getNotifications failed", error.message);
    return [];
  }
  return data.flatMap((r) =>
    r.id && r.title && r.due_date && r.status
      ? [
          {
            id: r.id,
            title: r.title,
            dueDate: r.due_date,
            amount: Number(r.amount_due ?? 0),
            currency: r.currency ?? "USD",
            status: r.status,
            autopay: r.autopay ?? false,
          },
        ]
      : [],
  );
}

export async function hasAnyTasks(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}
