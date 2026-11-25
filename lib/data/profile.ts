import "server-only";

import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

/** The signed-in user's profile (RLS-scoped). Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("getProfile failed", error.message);
    return null;
  }
  return data;
});
