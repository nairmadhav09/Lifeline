import "server-only";

import { cache } from "react";
import type { CategoryRef } from "@/lib/instances/types";
import { createClient } from "@/lib/supabase/server";

/** The user's categories in display order (RLS-scoped). Cached per request. */
export const getCategories = cache(async (): Promise<CategoryRef[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color")
    .order("sort_order")
    .order("name");
  if (error) {
    console.error("getCategories failed", error.message);
    return [];
  }
  return data;
});
