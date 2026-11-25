"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { addDaysISO } from "@/lib/utils/dates";
import type { ActionResult } from "@/types/domain";

const ALLOWED_RECEIPT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
] as const;

const receiptSchema = z.object({
  path: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_RECEIPT_TYPES),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(10 * 1024 * 1024),
});

const markPaidSchema = z.object({
  instanceId: z.uuid(),
  amountPaid: z.number().nonnegative().max(9_999_999_999).optional(),
  paidOn: z.iso.date().optional(),
  confirmationNumber: z.string().trim().max(80).optional(),
  receipt: receiptSchema.optional(),
});

export type MarkPaidInput = z.input<typeof markPaidSchema>;

const idSchema = z.uuid();

const GENERIC_ERROR = "Something went wrong saving that. Please try again.";

function done(): ActionResult {
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function markPaid(input: MarkPaidInput): Promise<ActionResult> {
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the details and try again.",
    };
  }
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { instanceId, amountPaid, paidOn, confirmationNumber, receipt } = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  if (paidOn && (paidOn > addDaysISO(today, 1) || paidOn < "2000-01-01")) {
    return { ok: false, error: "The paid date can't be in the future." };
  }
  if (receipt && !receipt.path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "That receipt upload isn't valid. Please try again." };
  }

  const supabase = await createClient();
  const { data: instance, error: readErr } = await supabase
    .from("task_instances")
    .select("id, amount_due, status")
    .eq("id", instanceId)
    .maybeSingle();
  if (readErr) return { ok: false, error: GENERIC_ERROR };
  if (!instance) return { ok: false, error: "That bill no longer exists." };

  const { error } = await supabase
    .from("task_instances")
    .update({
      status: "paid",
      amount_paid: amountPaid ?? instance.amount_due,
      // Store a paid *date* at midday UTC so it never drifts across days.
      paid_at: paidOn ? `${paidOn}T12:00:00.000Z` : new Date().toISOString(),
      confirmation_number: confirmationNumber || null,
      ...(receipt ? { receipt_path: receipt.path } : {}),
    })
    .eq("id", instanceId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  if (receipt) {
    const { error: docErr } = await supabase.from("documents").insert({
      user_id: user.id,
      storage_path: receipt.path,
      file_name: receipt.fileName,
      mime_type: receipt.mimeType,
      size_bytes: receipt.size,
      task_instance_id: instanceId,
    });
    if (docErr) console.error("receipt document insert failed", docErr.message);
  }

  return done();
}

/** Undo for "Mark paid": back to an open bill (status is re-derived by the view). */
export async function markUnpaid(instanceId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(instanceId).success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instances")
    .update({
      status: "upcoming",
      amount_paid: null,
      paid_at: null,
      confirmation_number: null,
      receipt_path: null,
    })
    .eq("id", instanceId);
  if (error) return { ok: false, error: GENERIC_ERROR };
  return done();
}

export async function skipInstance(instanceId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(instanceId).success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instances")
    .update({ status: "skipped" })
    .eq("id", instanceId)
    .neq("status", "paid");
  if (error) return { ok: false, error: GENERIC_ERROR };
  return done();
}

// ---------- Bulk ------------------------------------------------------

const idsSchema = z.array(z.uuid()).min(1).max(200);

/** Mark many open bills paid at their amount due, today. Returns the ids changed (for undo). */
export async function bulkMarkPaid(ids: string[]): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { data: rows, error: readErr } = await supabase
    .from("task_instances")
    .select("id, amount_due")
    .in("id", parsed.data)
    .eq("status", "upcoming");
  if (readErr) return { ok: false, error: GENERIC_ERROR };

  const paidAt = new Date().toISOString();
  const results = await Promise.all(
    rows.map((r) =>
      supabase
        .from("task_instances")
        .update({ status: "paid", amount_paid: r.amount_due, paid_at: paidAt })
        .eq("id", r.id),
    ),
  );
  const failed = results.filter((r) => r.error).length;
  revalidatePath("/dashboard");
  if (failed) return { ok: false, error: `${failed} of ${rows.length} bills couldn't be updated.` };
  return { ok: true, data: { ids: rows.map((r) => r.id) } };
}

export async function bulkMarkUnpaid(ids: string[]): Promise<ActionResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instances")
    .update({
      status: "upcoming",
      amount_paid: null,
      paid_at: null,
      confirmation_number: null,
      receipt_path: null,
    })
    .in("id", parsed.data)
    .eq("status", "paid");
  if (error) return { ok: false, error: GENERIC_ERROR };
  return done();
}

export async function bulkSkip(ids: string[]): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instances")
    .update({ status: "skipped" })
    .in("id", parsed.data)
    .eq("status", "upcoming")
    .select("id");
  if (error) return { ok: false, error: GENERIC_ERROR };
  revalidatePath("/dashboard");
  return { ok: true, data: { ids: data.map((r) => r.id) } };
}

export async function bulkUnskip(ids: string[]): Promise<ActionResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instances")
    .update({ status: "upcoming" })
    .in("id", parsed.data)
    .eq("status", "skipped");
  if (error) return { ok: false, error: GENERIC_ERROR };
  return done();
}

export async function unskipInstance(instanceId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(instanceId).success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_instances")
    .update({ status: "upcoming" })
    .eq("id", instanceId)
    .eq("status", "skipped");
  if (error) return { ok: false, error: GENERIC_ERROR };
  return done();
}
