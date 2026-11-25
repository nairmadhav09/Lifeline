import "server-only";

import { redirect } from "next/navigation";
import { ensureInstances } from "@/lib/data/instances";
import { getProfile } from "@/lib/data/profile";
import { getUser } from "@/lib/supabase/server";
import { periodFromMonthParam, periodOf, shiftPeriod, todayInTz } from "@/lib/utils/dates";

/**
 * Shared setup for month-scoped pages (dashboard, calendar, insights):
 * resolves the user, their local "today", the viewed period, and makes sure
 * instances exist for it.
 */
export async function getMonthContext(monthParam: string | undefined) {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user) redirect("/login");

  const timezone = profile?.timezone ?? "UTC";
  const currency = profile?.currency ?? "USD";
  const today = todayInTz(timezone);
  const currentPeriod = periodOf(today);
  const period = periodFromMonthParam(monthParam) ?? currentPeriod;

  // Materialise this + next month. Looking ahead also fills the viewed month;
  // past months are never back-filled (that would invent "overdue" bills).
  await ensureInstances(currentPeriod, 2);
  if (period > shiftPeriod(currentPeriod, 1)) await ensureInstances(period, 1);

  return { user, profile, timezone, currency, today, currentPeriod, period };
}
