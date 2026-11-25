import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Idempotently materialises task instances for the signed-in user.
 * Defaults to the current + next month (user's local timezone). Pass a
 * period (yyyy-MM-01) when navigating to another month.
 *
 * Never throws: a failure here must not take the dashboard down.
 */
export async function ensureInstances(fromPeriod?: string, months = 2): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_task_instances", {
    p_from: fromPeriod,
    p_months: months,
  });
  if (error) {
    console.error("ensure_task_instances failed", error.message);
    return 0;
  }
  return data ?? 0;
}
