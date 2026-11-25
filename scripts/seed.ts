/**
 * Seeds realistic demo data for one user: ~20 recurring obligations across
 * every category, with 3 months of paid history plus this month and next.
 *
 *   npm run seed                      # if the project has exactly one user
 *   npm run seed -- you@example.com   # pick a user by email
 *   npm run seed -- you@example.com --reset   # wipe that user's tasks first
 *
 * Uses the service-role key (bypasses RLS). Never ship this to the client.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../types/database";

type Recurrence = Database["public"]["Enums"]["recurrence_type"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const emailArg = args.find((a) => !a.startsWith("--"))?.toLowerCase();

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type SeedTask = {
  title: string;
  category: string;
  payee: string;
  amount: number;
  recurrence?: Recurrence;
  dueDay: number;
  dueMonth?: number;
  variable?: boolean;
  autopay?: boolean;
  method?: string;
  last4?: string;
  notes?: string;
  /** Multipliers for [3 months ago, 2 ago, last month, this month] on variable bills. */
  history?: [number, number, number, number];
  /** Leave this month's occurrence unpaid even if its due date has passed. */
  leaveUnpaid?: boolean;
};

const TASKS: SeedTask[] = [
  {
    title: "Mortgage",
    category: "Housing",
    payee: "Wells Fargo Home Mortgage",
    amount: 2150,
    dueDay: 1,
    autopay: true,
    method: "Checking",
    last4: "6612",
  },
  {
    title: "HOA dues",
    category: "Housing",
    payee: "Maple Grove HOA",
    amount: 185,
    dueDay: 10,
    method: "Checking",
  },
  {
    title: "Electricity",
    category: "Utilities",
    payee: "Pacific Gas & Electric",
    amount: 118,
    dueDay: 18,
    variable: true,
    autopay: true,
    method: "Visa",
    last4: "4242",
    history: [1.04, 0.96, 1.0, 1.42],
  },
  {
    title: "Water & sewer",
    category: "Utilities",
    payee: "City Water Department",
    amount: 46,
    dueDay: 22,
    variable: true,
    method: "Checking",
    history: [1.1, 0.95, 1.02, 0.98],
    leaveUnpaid: true,
  },
  {
    title: "Natural gas",
    category: "Utilities",
    payee: "SoCalGas",
    amount: 38,
    dueDay: 20,
    variable: true,
    method: "Checking",
    history: [0.7, 0.8, 1.0, 1.35],
    leaveUnpaid: true,
  },
  {
    title: "Internet",
    category: "Utilities",
    payee: "Comcast Xfinity",
    amount: 79.99,
    dueDay: 9,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "Mobile phone",
    category: "Utilities",
    payee: "Verizon",
    amount: 85,
    dueDay: 14,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "Car insurance",
    category: "Insurance",
    payee: "GEICO",
    amount: 142,
    dueDay: 15,
    autopay: true,
    method: "Chase Checking",
    last4: "4821",
  },
  {
    title: "Health insurance premium",
    category: "Insurance",
    payee: "Blue Shield of California",
    amount: 312,
    dueDay: 1,
    autopay: true,
    method: "Checking",
    last4: "6612",
  },
  {
    title: "Home insurance",
    category: "Insurance",
    payee: "State Farm",
    amount: 1380,
    recurrence: "yearly",
    dueDay: 12,
    dueMonth: 6,
    method: "Checking",
  },
  {
    title: "Term life insurance",
    category: "Insurance",
    payee: "Haven Life",
    amount: 420,
    recurrence: "yearly",
    dueDay: 3,
    dueMonth: 3,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "Quarterly estimated tax",
    category: "Taxes",
    payee: "IRS",
    amount: 1800,
    recurrence: "quarterly",
    dueDay: 15,
    dueMonth: 1,
    method: "IRS Direct Pay",
    notes: "Federal estimated tax (Form 1040-ES).",
  },
  {
    title: "Property tax",
    category: "Taxes",
    payee: "County Tax Collector",
    amount: 2400,
    recurrence: "half_yearly",
    dueDay: 10,
    dueMonth: 5,
    method: "Checking",
  },
  {
    title: "Car loan EMI",
    category: "Loans & EMIs",
    payee: "Chase Auto",
    amount: 389,
    dueDay: 5,
    autopay: true,
    method: "Chase Checking",
    last4: "4821",
  },
  {
    title: "Student loan",
    category: "Loans & EMIs",
    payee: "Nelnet",
    amount: 265,
    dueDay: 28,
    method: "Checking",
  },
  {
    title: "Chase Sapphire card",
    category: "Credit Cards",
    payee: "Chase",
    amount: 1240,
    dueDay: 23,
    variable: true,
    method: "Checking",
    last4: "9035",
    history: [0.92, 1.08, 0.97, 1.05],
  },
  {
    title: "Amex Gold card",
    category: "Credit Cards",
    payee: "American Express",
    amount: 680,
    dueDay: 27,
    variable: true,
    method: "Checking",
    last4: "1007",
    history: [1.15, 0.88, 1.02, 0.94],
  },
  {
    title: "Netflix",
    category: "Subscriptions",
    payee: "Netflix",
    amount: 15.99,
    dueDay: 3,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "Spotify Family",
    category: "Subscriptions",
    payee: "Spotify",
    amount: 19.99,
    dueDay: 7,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "iCloud+",
    category: "Subscriptions",
    payee: "Apple",
    amount: 2.99,
    dueDay: 19,
    autopay: true,
    method: "Apple Card",
  },
  {
    title: "Gym membership",
    category: "Healthcare",
    payee: "Bay Club",
    amount: 59,
    dueDay: 1,
    autopay: true,
    method: "Visa",
    last4: "4242",
  },
  {
    title: "Piano lessons",
    category: "Education",
    payee: "Harmony Music School",
    amount: 160,
    dueDay: 28,
    method: "Zelle",
  },
];

// ---------- date helpers (local calendar dates as yyyy-MM-dd) ----------
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
const round2 = (n: number) => Math.round(n * 100) / 100;

// Deterministic pseudo-random so re-seeding gives the same story.
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const confirmation = () =>
  Array.from(
    { length: 10 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(rand() * 31)],
  ).join("");

async function findUser() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const users = data.users;
  if (emailArg) {
    const u = users.find((x) => x.email?.toLowerCase() === emailArg);
    if (!u) throw new Error(`No user with email ${emailArg}. Sign in to the app once first.`);
    return u;
  }
  if (users.length === 1 && users[0]) return users[0];
  if (users.length === 0) throw new Error("No users yet. Sign in to the app once, then re-run.");
  throw new Error(
    `Several users found — pass one:\n  ${users.map((u) => `npm run seed -- ${u.email}`).join("\n  ")}`,
  );
}

async function main() {
  const user = await findUser();
  console.log(`Seeding demo data for ${user.email}`);

  // Profile + default categories (normally created by the signup trigger).
  await admin
    .from("profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const { error: catErr } = await admin.rpc("seed_default_categories", { p_user_id: user.id });
  if (catErr) throw catErr;

  const { count } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) {
    if (!reset) {
      console.error(
        `This user already has ${count} tasks. Re-run with --reset to replace them:\n  npm run seed -- ${user.email} --reset`,
      );
      process.exit(1);
    }
    console.log(`Removing ${count} existing tasks…`);
    await admin.from("ai_insights").delete().eq("user_id", user.id);
    await admin.from("documents").delete().eq("user_id", user.id);
    const { error } = await admin.from("tasks").delete().eq("user_id", user.id);
    if (error) throw error;
  }

  const { data: categories, error: listErr } = await admin
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id);
  if (listErr) throw listErr;
  const categoryId = new Map(categories.map((c) => [c.name, c.id]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const historyStart = firstOfMonth(today, -3);
  const startDate = iso(firstOfMonth(today, -12));

  const rows: TablesInsert<"tasks">[] = TASKS.map((t) => ({
    user_id: user.id,
    title: t.title,
    category_id: categoryId.get(t.category) ?? null,
    payee: t.payee,
    amount: t.amount,
    is_variable_amount: t.variable ?? false,
    recurrence: t.recurrence ?? "monthly",
    due_day: t.dueDay,
    due_month: t.dueMonth ?? null,
    start_date: startDate,
    payment_method: t.method ?? null,
    account_reference: t.last4 ?? null,
    autopay: t.autopay ?? false,
    notes: t.notes ?? null,
  }));

  // Inserting fires tasks_sync_instances → this month + next are created.
  const { data: inserted, error: insErr } = await admin
    .from("tasks")
    .insert(rows)
    .select("id, title");
  if (insErr) throw insErr;
  console.log(`Created ${inserted.length} tasks`);

  // Back-fill 3 months of history.
  const { data: histCount, error: genErr } = await admin.rpc("generate_task_instances", {
    p_user_id: user.id,
    p_from: iso(historyStart),
    p_months: 3,
  });
  if (genErr) throw genErr;
  console.log(`Generated ${histCount} historical instances`);

  // Shape the story: variable amounts, paid history, a couple overdue.
  const byTitle = new Map(inserted.map((t) => [t.id, TASKS.find((s) => s.title === t.title)!]));
  const { data: instances, error: instErr } = await admin
    .from("task_instances")
    .select("*")
    .eq("user_id", user.id);
  if (instErr) throw instErr;

  const currentPeriod = iso(firstOfMonth(today));
  const updates = instances.map((inst) => {
    const spec = byTitle.get(inst.task_id);
    const period = parse(inst.period);
    const monthsAgo =
      (today.getFullYear() - period.getFullYear()) * 12 + (today.getMonth() - period.getMonth());
    const due = parse(inst.due_date);
    const row = { ...inst };

    if (spec?.variable && spec.history && monthsAgo >= 0 && monthsAgo <= 3) {
      const factor = spec.history[3 - monthsAgo] ?? 1;
      row.amount_due = round2(spec.amount * factor);
    }

    const isPast = due < today;
    const isThisMonth = inst.period === currentPeriod;
    const shouldPay = monthsAgo > 0 || (isThisMonth && isPast && !spec?.leaveUnpaid);

    if (shouldPay) {
      const paidOn = new Date(due);
      if (!spec?.autopay) paidOn.setDate(paidOn.getDate() - Math.floor(rand() * 4));
      paidOn.setHours(10, 0, 0, 0);
      row.status = "paid";
      row.amount_paid = row.amount_due;
      row.paid_at = paidOn.toISOString();
      row.confirmation_number = confirmation();
    }
    return row;
  });

  const { error: upErr } = await admin.from("task_instances").upsert(updates);
  if (upErr) throw upErr;

  const paid = updates.filter((u) => u.status === "paid").length;
  console.log(
    `Instances: ${updates.length} total · ${paid} paid · ${updates.length - paid} open\nDone. Open http://localhost:3000/dashboard`,
  );
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
