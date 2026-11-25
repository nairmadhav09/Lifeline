import "server-only";

import { createClient } from "@/lib/supabase/server";
import { shiftPeriod } from "@/lib/utils/dates";

export type Anomaly = {
  taskId: string;
  title: string;
  currency: string;
  current: number;
  average: number;
  /** 0.42 = 42% above the trailing average. */
  change: number;
  months: number;
};

/** Flag a variable bill when it's more than this far above its trailing average. */
export const ANOMALY_THRESHOLD = 0.2;

/**
 * Rule-based (no AI): for each variable-amount bill, compare this month's
 * amount with the average of the previous 3 months it occurred in. Needs at
 * least 2 prior months so one odd month can't define "normal".
 */
export async function getAnomalies(period: string): Promise<Anomaly[]> {
  const from = shiftPeriod(period, -3);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instance_details")
    .select("task_id, title, currency, period, amount_due, amount_paid, status")
    .eq("is_variable_amount", true)
    .eq("task_is_archived", false)
    .gte("period", from)
    .lte("period", period)
    .neq("status", "skipped");
  if (error) {
    console.error("getAnomalies failed", error.message);
    return [];
  }

  type Series = { title: string; currency: string; current?: number; prior: number[] };
  const byTask = new Map<string, Series>();
  for (const r of data) {
    if (!r.task_id || !r.period) continue;
    const amount =
      Number(r.status === "paid" ? (r.amount_paid ?? r.amount_due) : r.amount_due) || 0;
    const s = byTask.get(r.task_id) ?? {
      title: r.title ?? "Bill",
      currency: r.currency ?? "USD",
      prior: [],
    };
    if (r.period === period) s.current = amount;
    else s.prior.push(amount);
    byTask.set(r.task_id, s);
  }

  const out: Anomaly[] = [];
  for (const [taskId, s] of byTask) {
    if (s.current === undefined || s.prior.length < 2) continue;
    const average = s.prior.reduce((a, b) => a + b, 0) / s.prior.length;
    if (average <= 0) continue;
    const change = (s.current - average) / average;
    if (change > ANOMALY_THRESHOLD) {
      out.push({
        taskId,
        title: s.title,
        currency: s.currency,
        current: s.current,
        average,
        change,
        months: s.prior.length,
      });
    }
  }
  return out.sort((a, b) => b.change - a.change);
}
