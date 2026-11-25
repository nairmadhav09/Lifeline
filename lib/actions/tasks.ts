"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/data/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import { formValuesToRow, taskFormSchema, type TaskFormValues } from "@/lib/tasks/schema";
import type { ActionResult, Task } from "@/types/domain";

const GENERIC_ERROR = "Something went wrong saving that. Please try again.";
const SESSION_ERROR = "Your session expired. Please sign in again.";

const idSchema = z.uuid();
const idsSchema = z.array(z.uuid()).min(1).max(200);

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

function validationError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    ok: false,
    error: error.issues[0]?.message ?? "Please check the highlighted fields.",
    fieldErrors,
  };
}

/** Postgres error → friendly copy. */
function friendly(code: string | undefined): string {
  if (code === "23503") return "That category no longer exists. Pick another one.";
  if (code === "23514") return "Some details aren't valid. Please review the form.";
  return GENERIC_ERROR;
}

export async function getTask(taskId: string): Promise<ActionResult<Task>> {
  if (!idSchema.safeParse(taskId).success) return { ok: false, error: "That bill wasn't found." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) return { ok: false, error: GENERIC_ERROR };
  if (!data) return { ok: false, error: "That bill wasn't found." };
  return { ok: true, data };
}

export async function createTask(values: TaskFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = taskFormSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error);
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user) return { ok: false, error: SESSION_ERROR };

  const supabase = await createClient();
  // Insert fires tasks_sync_instances → this month + next are generated.
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...formValuesToRow(parsed.data),
      user_id: user.id,
      currency: profile?.currency ?? "USD",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendly(error.code) };

  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateTask(
  taskId: string,
  values: TaskFormValues,
): Promise<ActionResult<{ id: string }>> {
  if (!idSchema.safeParse(taskId).success) return { ok: false, error: GENERIC_ERROR };
  const parsed = taskFormSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  // Schedule/amount changes rebuild open instances via the DB trigger;
  // paid and skipped history is never touched.
  const { data, error } = await supabase
    .from("tasks")
    .update(formValuesToRow(parsed.data))
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: friendly(error.code) };
  if (!data) return { ok: false, error: "That bill wasn't found." };

  refresh();
  return { ok: true, data: { id: data.id } };
}

async function setArchived(
  taskIds: string[],
  archived: boolean,
): Promise<ActionResult<{ count: number }>> {
  const parsed = idsSchema.safeParse(taskIds);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ is_archived: archived, archived_at: archived ? new Date().toISOString() : null })
    .in("id", parsed.data)
    .select("id");
  if (error) return { ok: false, error: GENERIC_ERROR };
  refresh();
  return { ok: true, data: { count: data.length } };
}

/** Archive (never hard-delete): stops tracking, keeps paid history. */
export async function archiveTasks(taskIds: string[]) {
  return setArchived(taskIds, true);
}

export async function restoreTasks(taskIds: string[]) {
  return setArchived(taskIds, false);
}

export async function setTasksCategory(
  taskIds: string[],
  categoryId: string | null,
): Promise<ActionResult<{ count: number }>> {
  const ids = idsSchema.safeParse(taskIds);
  const cat = idSchema.nullable().safeParse(categoryId);
  if (!ids.success || !cat.success) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ category_id: cat.data })
    .in("id", ids.data)
    .select("id");
  if (error) return { ok: false, error: friendly(error.code) };
  refresh();
  return { ok: true, data: { count: data.length } };
}
