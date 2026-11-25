/**
 * Proves Row Level Security isolates users. Creates two throwaway users,
 * has user A create data, then checks that user B and anonymous visitors
 * can neither read nor modify it. Cleans up after itself.
 *
 *   npm run verify:rls
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "../types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

type Client = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin: Client = createClient<Database>(url, serviceKey, opts);

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail?: string) =>
  results.push({ name, pass, detail });

async function makeUser(label: string) {
  const email = `rls-test-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const client: Client = createClient<Database>(url!, anonKey!, opts);
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`signIn failed: ${signInErr.message}`);
  return { id: data.user.id, client };
}

async function main() {
  const a = await makeUser("a");
  const b = await makeUser("b");
  try {
    // --- setup: A creates a task (trigger generates instances) ---
    const { data: catA } = await a.client.from("categories").select("id").limit(1).single();
    check("signup trigger created A's default categories", !!catA);

    const { data: taskA, error: taskErr } = await a.client
      .from("tasks")
      .insert({
        user_id: a.id,
        title: "RLS probe",
        amount: 10,
        due_day: 15,
        // Started well in the past so this month's occurrence is always generated
        // (a bill's first due date is the first one on/after its start date).
        start_date: "2025-01-01",
        category_id: catA?.id ?? null,
      })
      .select()
      .single();
    if (taskErr || !taskA) throw new Error(`A could not create a task: ${taskErr?.message}`);

    const { data: instA } = await a.client
      .from("task_instances")
      .select("id")
      .eq("task_id", taskA.id);
    check(
      "creating a task auto-generates this + next month",
      (instA?.length ?? 0) === 2,
      `got ${instA?.length}`,
    );

    const { data: viewA } = await a.client
      .from("task_instance_details")
      .select("id, status")
      .eq("task_id", taskA.id);
    check("A can read own rows through the status view", (viewA?.length ?? 0) === 2);

    const path = `${a.id}/probe.pdf`;
    const up = await a.client.storage
      .from("documents")
      .upload(path, new Blob(["%PDF-1.4 probe"], { type: "application/pdf" }));
    check("A can upload to own storage folder", !up.error, up.error?.message);

    // --- B must not see or touch A's data ---
    for (const table of [
      "tasks",
      "task_instances",
      "categories",
      "profiles",
      "documents",
      "ai_insights",
    ] as const) {
      const { data } = await b.client.from(table).select("user_id");
      const leaked = (data ?? []).filter((r) => r.user_id !== b.id).length;
      check(`B sees none of A's ${table}`, leaked === 0, `${leaked} foreign rows`);
    }

    const { data: viewB } = await b.client
      .from("task_instance_details")
      .select("id")
      .eq("task_id", taskA.id);
    check("B sees none of A's rows in the status view", (viewB?.length ?? 0) === 0);

    const { data: upd } = await b.client
      .from("tasks")
      .update({ title: "hacked" })
      .eq("id", taskA.id)
      .select();
    check("B cannot update A's task", (upd?.length ?? 0) === 0);

    const { data: del } = await b.client.from("tasks").delete().eq("id", taskA.id).select();
    check("B cannot delete A's task", (del?.length ?? 0) === 0);

    const { error: spoofErr } = await b.client
      .from("tasks")
      .insert({ user_id: a.id, title: "spoof", amount: 1, due_day: 1 });
    check("B cannot insert rows owned by A", !!spoofErr);

    const { error: fkErr } = await b.client.from("task_instances").insert({
      user_id: b.id,
      task_id: taskA.id,
      period: "2026-01-01",
      due_date: "2026-01-15",
    });
    check("B cannot attach an instance to A's task", !!fkErr);

    const { error: catErr } = await b.client
      .from("tasks")
      .insert({ user_id: b.id, title: "x", amount: 1, due_day: 1, category_id: catA?.id ?? null });
    check("B cannot use A's category", !!catErr);

    const { error: genErr } = await b.client.rpc("generate_task_instances", {
      p_user_id: a.id,
      p_from: "2026-01-01",
    });
    check("B cannot call the internal generator for A", !!genErr);

    const { error: ensureErr } = await b.client.rpc("ensure_task_instances", {});
    check("B can call ensure_task_instances for self", !ensureErr, ensureErr?.message);

    const dl = await b.client.storage.from("documents").download(path);
    check("B cannot download A's file", !!dl.error);

    const bUp = await b.client.storage
      .from("documents")
      .upload(`${a.id}/evil.pdf`, new Blob(["x"], { type: "application/pdf" }));
    check("B cannot upload into A's folder", !!bUp.error);

    // --- anonymous visitors get nothing ---
    const anon: Client = createClient<Database>(url!, anonKey!, opts);
    for (const table of ["tasks", "task_instances", "profiles"] as const) {
      const { data, error } = await anon.from(table).select("id");
      check(`anonymous cannot read ${table}`, !!error || (data?.length ?? 0) === 0);
    }
    const { error: anonRpc } = await anon.rpc("ensure_task_instances", {});
    check("anonymous cannot generate instances", !!anonRpc);

    // A's data is intact after all of B's attempts.
    const { data: still } = await a.client
      .from("tasks")
      .select("title")
      .eq("id", taskA.id)
      .single();
    check("A's task is unchanged", still?.title === "RLS probe");

    await a.client.storage.from("documents").remove([path]);
  } finally {
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
  }

  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    console.log(
      `${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(width)}${r.pass || !r.detail ? "" : `  (${r.detail})`}`,
    );
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("verify-rls crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
