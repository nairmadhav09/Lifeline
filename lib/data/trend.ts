import "server-only";

import { createClient } from "@/lib/supabase/server";
import { shiftPeriod } from "@/lib/utils/dates";

export type MonthTotal = {
  period: string;
  /** Total obligations that month (skipped excluded). */
  due: number;
  paid: number;
  count: number;
};

/**
 * Totals for the `months` months ending at `endPeriod` (inclusive), oldest
 * first. Archived bills are excluded so the latest bar matches the
 * dashboard's "Due this month" card.
 */
export async function getMonthlyTotals(endPeriod: string, months = 6): Promise<MonthTotal[]> {
  const startPeriod = shiftPeriod(endPeriod, -(months - 1));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instance_details")
    .select("period, amount_due, amount_paid, status")
    .gte("period", startPeriod)
    .lte("period", endPeriod)
    .eq("task_is_archived", false)
    .neq("status", "skipped");
  if (error) throw new Error(`Couldn't load monthly totals: ${error.message}`);

  const totals = new Map<string, MonthTotal>();
  for (let i = 0; i < months; i++) {
    const period = shiftPeriod(startPeriod, i);
    totals.set(period, { period, due: 0, paid: 0, count: 0 });
  }
  for (const r of data) {
    const t = r.period ? totals.get(r.period) : undefined;
    if (!t) continue;
    const due = Number(r.amount_due ?? 0);
    t.due += due;
    t.count += 1;
    if (r.status === "paid") t.paid += Number(r.amount_paid ?? due);
  }
  return [...totals.values()].map((t) => ({
    ...t,
    due: Math.round(t.due * 100) / 100,
    paid: Math.round(t.paid * 100) / 100,
  }));
}
