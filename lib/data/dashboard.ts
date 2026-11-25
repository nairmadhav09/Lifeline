import "server-only";

import { createClient } from "@/lib/supabase/server";
import { addDaysISO } from "@/lib/utils/dates";
import type { InstanceItem } from "@/lib/instances/types";
import type { Category, InstanceDetails } from "@/types/domain";

const SELECT =
  "id, task_id, period, due_date, amount_due, amount_paid, status, paid_at, confirmation_number, receipt_path, title, payee, currency, is_variable_amount, recurrence, autopay, category_id, category_name, category_icon, category_color";

type Row = Pick<
  InstanceDetails,
  | "id"
  | "task_id"
  | "period"
  | "due_date"
  | "amount_due"
  | "amount_paid"
  | "status"
  | "paid_at"
  | "confirmation_number"
  | "receipt_path"
  | "title"
  | "payee"
  | "currency"
  | "is_variable_amount"
  | "recurrence"
  | "autopay"
  | "category_id"
  | "category_name"
  | "category_icon"
  | "category_color"
>;

/** View columns are nullable in generated types; drop anything malformed. */
function toItem(r: Row): InstanceItem | null {
  if (!r.id || !r.task_id || !r.period || !r.due_date || !r.status || !r.title) return null;
  return {
    id: r.id,
    taskId: r.task_id,
    period: r.period,
    dueDate: r.due_date,
    amountDue: Number(r.amount_due ?? 0),
    amountPaid: r.amount_paid === null ? null : Number(r.amount_paid),
    status: r.status,
    paidAt: r.paid_at,
    confirmationNumber: r.confirmation_number,
    receiptPath: r.receipt_path,
    title: r.title,
    payee: r.payee,
    currency: r.currency ?? "USD",
    isVariable: r.is_variable_amount ?? false,
    recurrence: r.recurrence ?? "monthly",
    autopay: r.autopay ?? false,
    category:
      r.category_id && r.category_name
        ? {
            id: r.category_id,
            name: r.category_name,
            icon: r.category_icon ?? "circle-ellipsis",
            color: r.category_color ?? "slate",
          }
        : null,
  };
}

const compact = (rows: Row[] | null): InstanceItem[] =>
  (rows ?? []).map(toItem).filter((x): x is InstanceItem => x !== null);

export type DashboardData = {
  /** Every occurrence in the viewed month. */
  month: InstanceItem[];
  /** Open items due from today through the next 7 days (may span months). */
  nextWeek: InstanceItem[];
  /** The next open item due today or later, for the "Next due" card. */
  nextDue: InstanceItem | null;
  categories: Pick<Category, "id" | "name" | "icon" | "color">[];
  hasAnyTasks: boolean;
};

export async function getDashboardData(period: string, today: string): Promise<DashboardData> {
  const supabase = await createClient();
  const weekEnd = addDaysISO(today, 7);

  const [monthRes, weekRes, nextRes, catRes, taskCount] = await Promise.all([
    supabase
      .from("task_instance_details")
      .select(SELECT)
      .eq("period", period)
      .eq("task_is_archived", false)
      .order("due_date")
      .order("title"),
    supabase
      .from("task_instance_details")
      .select(SELECT)
      .eq("task_is_archived", false)
      .in("status", ["upcoming", "due_soon"])
      .gte("due_date", today)
      .lte("due_date", weekEnd)
      .order("due_date"),
    supabase
      .from("task_instance_details")
      .select(SELECT)
      .eq("task_is_archived", false)
      .in("status", ["upcoming", "due_soon"])
      .gte("due_date", today)
      .order("due_date")
      .order("amount_due", { ascending: false })
      .limit(1),
    supabase.from("categories").select("id, name, icon, color").order("sort_order").order("name"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("is_archived", false),
  ]);

  const firstError = monthRes.error ?? weekRes.error ?? nextRes.error ?? catRes.error;
  if (firstError) throw new Error(`Couldn't load your dashboard: ${firstError.message}`);

  return {
    month: compact(monthRes.data),
    nextWeek: compact(weekRes.data),
    nextDue: compact(nextRes.data)[0] ?? null,
    categories: catRes.data ?? [],
    hasAnyTasks: (taskCount.count ?? 0) > 0,
  };
}
