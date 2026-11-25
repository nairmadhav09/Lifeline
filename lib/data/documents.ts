import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DocumentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number | null;
  createdAt: string;
  storagePath: string;
  bill: { title: string; dueDate: string } | null;
};

export async function getDocuments(): Promise<DocumentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_name, mime_type, size_bytes, created_at, storage_path, task_instance_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load documents: ${error.message}`);

  const instanceIds = data.map((d) => d.task_instance_id).filter((x): x is string => !!x);
  const bills = new Map<string, { title: string; dueDate: string }>();
  if (instanceIds.length) {
    const { data: inst } = await supabase
      .from("task_instance_details")
      .select("id, title, due_date")
      .in("id", instanceIds);
    for (const i of inst ?? []) {
      if (i.id && i.title && i.due_date) bills.set(i.id, { title: i.title, dueDate: i.due_date });
    }
  }

  return data.map((d) => ({
    id: d.id,
    fileName: d.file_name,
    mimeType: d.mime_type,
    size: d.size_bytes,
    createdAt: d.created_at,
    storagePath: d.storage_path,
    bill: d.task_instance_id ? (bills.get(d.task_instance_id) ?? null) : null,
  }));
}
