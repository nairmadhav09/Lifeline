"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CURRENCY_CODES, isValidTimeZone } from "@/lib/constants/currencies";
import { createClient, getUser } from "@/lib/supabase/server";
import { periodOf, todayInTz } from "@/lib/utils/dates";
import { Constants, type TablesInsert } from "@/types/database";
import type { ActionResult } from "@/types/domain";

const itemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().max(40),
  amount: z.number().nonnegative().max(9_999_999_999),
  isVariable: z.boolean(),
  recurrence: z.enum(Constants.public.Enums.recurrence_type),
  dueDay: z.number().int().min(1).max(31),
  dueMonth: z.number().int().min(1).max(12).nullable(),
});

const onboardingSchema = z.object({
  displayName: z.string().trim().max(80),
  currency: z.enum(CURRENCY_CODES),
  timezone: z.string().refine(isValidTimeZone, "Pick a valid timezone"),
  items: z.array(itemSchema).max(30),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

/**
 * Saves preferences, creates the picked bills, and marks onboarding done.
 * Bills start this month so the dashboard is populated immediately; any
 * occurrence already past this month is marked "skipped" (it predates
 * tracking), never "overdue" and never "paid".
 */
export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { displayName, currency, timezone, items } = parsed.data;
  const supabase = await createClient();

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null, currency, timezone })
    .eq("user_id", user.id);
  if (profileErr)
    return { ok: false, error: "We couldn't save your preferences. Please try again." };

  if (items.length > 0) {
    const today = todayInTz(timezone);
    const monthStart = periodOf(today);
    const { data: cats } = await supabase.from("categories").select("id, name");
    const catId = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));

    const rows: TablesInsert<"tasks">[] = items.map((i) => ({
      user_id: user.id,
      title: i.title,
      category_id: catId.get(i.category.toLowerCase()) ?? null,
      amount: i.amount,
      currency,
      is_variable_amount: i.isVariable,
      recurrence: i.recurrence,
      due_day: i.dueDay,
      due_month: i.recurrence === "monthly" ? null : i.dueMonth,
      start_date: monthStart,
      end_date: null,
      payee: null,
      payment_method: null,
      account_reference: null,
      autopay: false,
      reminder_days_before: [3, 1],
      notes: null,
      is_archived: false,
    }));
    const { data: created, error: insErr } = await supabase.from("tasks").insert(rows).select("id");
    if (insErr) return { ok: false, error: "We couldn't add your bills. Please try again." };

    // Occurrences already behind us this month predate tracking: skip, don't flag overdue.
    await supabase
      .from("task_instances")
      .update({ status: "skipped" })
      .in(
        "task_id",
        created.map((t) => t.id),
      )
      .eq("period", monthStart)
      .lt("due_date", today)
      .eq("status", "upcoming");
  }

  const { error: doneErr } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);
  if (doneErr) return { ok: false, error: "Almost there. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
