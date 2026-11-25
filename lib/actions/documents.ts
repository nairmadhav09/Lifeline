"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/domain";

const GENERIC = "Something went wrong. Please try again.";
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"] as const;

/** A short-lived private link to open a stored file (RLS-checked). */
export async function getDocumentUrl(id: string): Promise<ActionResult<{ url: string }>> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "That file no longer exists." };
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60);
  if (error || !data) return { ok: false, error: "Couldn't open that file." };
  return { ok: true, data: { url: data.signedUrl } };
}

const registerSchema = z.object({
  path: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(10 * 1024 * 1024),
});

/** Record a file the browser just uploaded to documents/<uid>/… */
export async function registerDocument(
  input: z.input<typeof registerSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That file type isn't supported." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (!parsed.data.path.startsWith(`${user.id}/`)) return { ok: false, error: GENERIC };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      storage_path: parsed.data.path,
      file_name: parsed.data.fileName,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.size,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/documents");
  return { ok: true, data: { id: data.id } };
}

/** Delete the stored file and its record; detaches it from any bill. */
export async function deleteDocument(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, task_instance_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "That file no longer exists." };

  const { error: storageErr } = await supabase.storage.from("documents").remove([doc.storage_path]);
  if (storageErr) return { ok: false, error: "Couldn't delete the file. Please try again." };

  if (doc.task_instance_id) {
    await supabase
      .from("task_instances")
      .update({ receipt_path: null })
      .eq("id", doc.task_instance_id)
      .eq("receipt_path", doc.storage_path);
  }
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: GENERIC };

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
