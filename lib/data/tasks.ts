import "server-only";

import type { CategoryRef } from "@/lib/instances/types";
import { createClient } from "@/lib/supabase/server";
import type { Schedule } from "@/lib/tasks/schedule";
import type { InstanceStatus } from "@/types/domain";

export type TaskListItem = {
  id: string;
  title: string;
  payee: string | null;
  amount: number;
  currency: string;
  isVariable: boolean;
  autopay: boolean;
  isArchived: boolean;
  schedule: Schedule;
  category: CategoryRef | null;
  /** Earliest open occurrence (may be overdue). */
  next: { dueDate: string; status: InstanceStatus } | null;
};

export async function getTaskList(): Promise<TaskListItem[]> {
  const supabase = await createClient();
  const [tasksRes, openRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, payee, amount, currency, is_variable_amount, autopay, is_archived, recurrence, due_day, due_month, start_date, end_date, category_id, categories(id, name, icon, color)",
      )
      .order("is_archived")
      .order("title"),
    supabase
      .from("task_instance_details")
      .select("task_id, due_date, status")
      .in("status", ["overdue", "due_soon", "upcoming"])
      .eq("task_is_archived", false)
      .order("due_date"),
  ]);
  if (tasksRes.error) throw new Error(`Couldn't load your bills: ${tasksRes.error.message}`);

  const next = new Map<string, TaskListItem["next"]>();
  for (const r of openRes.data ?? []) {
    if (r.task_id && r.due_date && r.status && !next.has(r.task_id)) {
      next.set(r.task_id, { dueDate: r.due_date, status: r.status });
    }
  }

  return tasksRes.data.map((t) => ({
    id: t.id,
    title: t.title,
    payee: t.payee,
    amount: Number(t.amount),
    currency: t.currency,
    isVariable: t.is_variable_amount,
    autopay: t.autopay,
    isArchived: t.is_archived,
    schedule: {
      recurrence: t.recurrence,
      dueDay: t.due_day,
      dueMonth: t.due_month,
      startDate: t.start_date,
      endDate: t.end_date,
    },
    category: t.categories ?? null,
    next: next.get(t.id) ?? null,
  }));
}
