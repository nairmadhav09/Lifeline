// Supabase Edge Function: daily email reminders (scaffold).
//
// Finds every open bill whose due date is N days away, where N is one of the
// bill's `reminder_days_before` values (e.g. {3,1}), using each user's own
// timezone, and builds one digest per user.
//
// Deploy:   npx supabase functions deploy send-reminders
// Schedule: see supabase/functions/send-reminders/README.md (pg_cron)
//
// TODO(email): plug in an email provider (e.g. Resend, Postmark, SES) in
// `sendDigest` below. Until then the function only logs what it would send,
// so it's safe to deploy and schedule.

import { createClient } from "jsr:@supabase/supabase-js@2";

type ReminderRow = {
  user_id: string;
  title: string;
  due_date: string;
  amount_due: number;
  currency: string;
  autopay: boolean;
  days_until_due: number;
};

type Digest = { userId: string; email: string; items: ReminderRow[] };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Shared secret so only the scheduler can trigger sends.
const CRON_SECRET = Deno.env.get("REMINDERS_CRON_SECRET");

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Service role: this job reads every user's bills. It never returns them.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // days_until_due is computed by the view in each user's own timezone.
  const { data: rows, error } = await admin
    .from("task_instance_details")
    .select("user_id, task_id, title, due_date, amount_due, currency, autopay, days_until_due")
    .in("status", ["upcoming", "due_soon"])
    .eq("task_is_archived", false)
    .gte("days_until_due", 0)
    .lte("days_until_due", 60);
  if (error) return new Response(error.message, { status: 500 });

  // Keep only bills whose reminder schedule includes today's distance.
  const taskIds = [...new Set(rows.map((r) => r.task_id))];
  const { data: tasks } = await admin.from("tasks").select("id, reminder_days_before").in("id", taskIds);
  const reminderDays = new Map((tasks ?? []).map((t) => [t.id, t.reminder_days_before as number[]]));
  const due = rows.filter((r) => reminderDays.get(r.task_id)?.includes(r.days_until_due));

  const byUser = new Map<string, ReminderRow[]>();
  for (const r of due) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r as ReminderRow]);

  let sent = 0;
  for (const [userId, items] of byUser) {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    if (!u.user?.email) continue;
    await sendDigest({ userId, email: u.user.email, items });
    sent++;
  }

  return Response.json({ users: sent, reminders: due.length });
});

async function sendDigest(digest: Digest): Promise<void> {
  const lines = digest.items
    .sort((a, b) => a.days_until_due - b.days_until_due)
    .map(
      (i) =>
        `• ${i.title}: ${i.currency} ${Number(i.amount_due).toFixed(2)} due ${
          i.days_until_due === 0 ? "today" : `in ${i.days_until_due} day(s)`
        }${i.autopay ? " (autopay)" : ""}`,
    );
  // TODO(email): send `lines` to digest.email via your provider.
  console.log(`[send-reminders] would email user ${digest.userId}:\n${lines.join("\n")}`);
}
