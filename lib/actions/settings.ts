"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORY_ICONS } from "@/components/features/categories/category-icon";
import { CURRENCY_CODES, isValidTimeZone } from "@/lib/constants/currencies";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { CATEGORY_COLORS, type ActionResult } from "@/types/domain";

const GENERIC = "Something went wrong saving that. Please try again.";
const SESSION = "Your session expired. Please sign in again.";

function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------- Profile & preferences ------------------------------------

const profileSchema = z.object({
  displayName: z.string().trim().max(80, "Keep it under 80 characters"),
  currency: z.enum(CURRENCY_CODES),
  timezone: z.string().refine(isValidTimeZone, "Pick a valid timezone"),
  monthlyBudget: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{1,10}(\.\d{1,2})?$/.test(v.replace(/,/g, "")),
      "Use a number like 4500",
    ),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const user = await getUser();
  if (!user) return { ok: false, error: SESSION };

  const { displayName, currency, timezone, monthlyBudget } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      currency,
      timezone,
      monthly_budget: monthlyBudget ? Number(monthlyBudget.replace(/,/g, "")) : null,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC };

  // Keep bills in the profile currency so totals add up (amounts are not converted).
  await supabase
    .from("tasks")
    .update({ currency })
    .eq("user_id", user.id)
    .neq("currency", currency);

  refreshAll();
  return { ok: true, data: undefined };
}

// ---------- Categories ------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(40, "Keep it under 40 characters"),
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "Pick an icon"),
  color: z.enum(CATEGORY_COLORS),
});

export type CategoryInput = z.input<typeof categorySchema>;

function categoryError(code: string | undefined): string {
  return code === "23505" ? "You already have a category with that name." : GENERIC;
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };
  const user = await getUser();
  if (!user) return { ok: false, error: SESSION };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id, sort_order: (last?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error) return { ok: false, error: categoryError(error.code) };
  refreshAll();
  return { ok: true, data: { id: data.id } };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return {
      ok: false,
      error: parsed.success ? GENERIC : (parsed.error.issues[0]?.message ?? GENERIC),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: categoryError(error.code) };
  refreshAll();
  return { ok: true, data: undefined };
}

/** Bills in a deleted category become "Uncategorized" (FK: on delete set null). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: GENERIC };
  refreshAll();
  return { ok: true, data: undefined };
}

// ---------- Account deletion ----------------------------------------

const DELETE_PHRASE = "DELETE";

/**
 * Permanently deletes the signed-in user: their uploaded files, then their
 * auth account (every table cascades from auth.users).
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim() !== DELETE_PHRASE) {
    return { ok: false, error: `Type ${DELETE_PHRASE} to confirm.` };
  }
  const user = await getUser();
  if (!user) return { ok: false, error: SESSION };

  const admin = createAdminClient();
  const bucket = admin.storage.from("documents");

  // Storage has folders, not cascades: collect every file under documents/<uid>/.
  const collect = async (prefix: string, depth = 0): Promise<string[]> => {
    if (depth > 4) return [];
    const { data } = await bucket.list(prefix, { limit: 1000 });
    const out: string[] = [];
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id) out.push(path);
      else out.push(...(await collect(path, depth + 1)));
    }
    return out;
  };
  const files = await collect(user.id);
  for (let i = 0; i < files.length; i += 100) await bucket.remove(files.slice(i, i + 100));

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "We couldn't delete your account. Please try again." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
