# Lifeline

A calm, private dashboard for everything you pay on a schedule: rent, utilities, insurance,
taxes, loans, credit cards and subscriptions. See what's due, what's overdue and what's paid,
and mark bills paid in one click.

**Stack:** Next.js 16 (App Router, Server Components, Server Actions) · TypeScript (strict) ·
Tailwind CSS 4 · shadcn/ui on Radix · Supabase (Postgres, Auth, Storage, Row Level Security) ·
Zod · react-hook-form · Recharts · date-fns · sonner · framer-motion

> AI features (natural-language quick add, bill scanning, AI summaries) were scoped out.
> Unusual-bill detection is rule-based instead (see [How it works](#how-it-works)).

---

## Features

| Area | What you get |
| --- | --- |
| **Dashboard** | Due / paid / overdue / next-due cards, budget usage, a "this week" banner, bills grouped Overdue → Due this week → Upcoming → Paid, month switcher, filters and search, spending-by-category and 6-month charts |
| **One-click paying** | **Mark paid** updates everything instantly with an **Undo** toast; ▾ adds amount, date, confirmation number and a receipt |
| **Bills** | Add/edit in a side sheet with a live schedule preview; monthly, quarterly, every 6 months, yearly or one-time; variable amounts; autopay; reminders; archive (never delete) with restore |
| **Bulk actions** | Select many bills to mark paid, skip or re-categorise (dashboard) or archive/restore (Tasks), each with Undo |
| **Calendar** | Month grid with status dots; pick a day to see and pay its bills; keyboard navigable |
| **Insights** | 6-month trend, spending by category, and "unusual this month" (variable bills > 20% above their 3-month average) |
| **Onboarding** | 3 steps: preferences → pick common bills → amounts. New users land on a populated dashboard |
| **Settings** | Name, currency, timezone, monthly budget, category management, CSV export, account deletion |
| **Notifications** | Bell with overdue and next-7-days reminders. Email reminders are scaffolded (see below) |
| **Documents** | Private uploads and receipts with expiring links |
| **Everywhere** | ⌘K / Ctrl+K command menu, light and dark mode, responsive down to 375px, WCAG AA contrast |

---

## Setup

### 1. Prerequisites
- **Node.js 20.9+** (developed on Node 24). Check with `node -v`.
- A free **Supabase** account: <https://supabase.com>.

### 2. Install
```bash
npm install
```

### 3. Create the Supabase project
1. Supabase dashboard → **New project** (the free plan is fine). Save the database password.
2. When asked about Data API: keep **Enable Data API** on; **Enable RLS automatically** is recommended.
3. **Project Settings → API Keys**: copy the **Project URL**, the **anon / publishable** key and
   the **service_role / secret** key.

### 4. Environment variables
Copy `.env.example` to `.env.local` and fill it in:

| Variable | Value | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | no (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key | **yes, server only** |

`.env.local` is git-ignored. Never commit it or share the service-role key.

### 5. Create the database
In Supabase → **SQL Editor**, run each file in `supabase/migrations/` **in order**, once each
(or `npx supabase db push` if you use the Supabase CLI):

1. `20261125000001_schema.sql`: tables, constraints, Row Level Security, grants
2. `20261125000002_logic.sql`: signup trigger, default categories, instance generation, status view
3. `20261125000003_storage.sql`: private `documents` bucket and storage policies
4. `20261125000004_first_due_on_or_after_start.sql`: a bill first comes due on/after its start date

### 6. Auth settings
Supabase → **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

Email magic links work out of the box. **Google sign-in is optional**: enable the Google provider
under Authentication → Providers, and add `https://<project-ref>.supabase.co/auth/v1/callback`
as an authorised redirect URI in Google Cloud Console.

### 7. Run
```bash
npm run dev
```
Open <http://localhost:3000>, sign in with your email, and click the link you receive.

### 8. (Optional) Demo data
```bash
npm run seed                              # if the project has exactly one user
npm run seed -- you@example.com --reset   # pick a user; replace their bills
```
This creates 22 bills and 3 months of history, including two overdue bills and an electricity
spike that "Unusual this month" flags.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (Next + TypeScript + React Compiler rules) |
| `npm run format` | Prettier, with Tailwind class sorting |
| `npm run seed` | Demo data for one user (uses the service-role key) |
| `npm run verify:rls` | Creates two throwaway users and checks 25 isolation rules (RLS, FKs, storage, anon access) |

---

## How it works

### Data model
| Table | One row is… |
| --- | --- |
| `profiles` | A user's name, currency, timezone, budget and onboarding flag (created on signup) |
| `categories` | A category; 10 defaults are seeded per user on signup |
| `tasks` | A **recurring bill template** ("Netflix, $15.99, monthly on the 3rd") |
| `task_instances` | **One occurrence** of a bill in one month ("Netflix, Nov 2026, paid") |
| `documents` | An uploaded file (stored privately at `documents/<user_id>/…`) |
| `ai_insights` | Reserved for cached insights (unused while AI is scoped out) |

- **Instances are generated idempotently** by `generate_task_instances()` for the current and next
  month: by a trigger when a bill is created or its schedule changes, and on page load through the
  `ensure_task_instances()` RPC. Past months are never back-filled.
- **`due_soon` (≤ 3 days) and `overdue` are never stored.** They're derived at read time in the
  `task_instance_details` view, using each user's own timezone, so they can't go stale.
- **Editing a bill** rebuilds its unpaid occurrences from this month on. Paid and skipped history is
  never touched. **Archiving** removes unpaid occurrences and keeps payment history.
- **Unusual bills** are rule-based: a variable-amount bill is flagged when this month is more than
  20% above the average of its previous 3 months (with at least 2 months of history).

### Security
- **Row Level Security on every table and the storage bucket**: users can only read or write rows
  where `user_id = auth.uid()`. The status view uses `security_invoker`, so RLS applies through it.
- **Composite foreign keys** `(id, user_id)`: a row can never point at another user's task,
  category or instance, even with a guessed UUID.
- **`anon` has no table grants**; internal functions are callable only by the service role.
- **Only the last 4 digits** of an account number are stored. Pasting a full number keeps just the last 4.
- **Every Server Action validates its input with Zod** and returns typed `{ ok, data | error }` results.
- **Post-login redirects** only accept same-site paths (no open redirects).
- **CSV export** neutralises spreadsheet formula injection.
- The **service-role key** is used only server-side: for seeding, the RLS test, and deleting
  your own account.

### Project structure
```
app/
  (auth)/login           sign-in page + auth actions
  (app)/…                dashboard, tasks, calendar, insights, documents, settings
  onboarding/            first-run flow
  auth/callback/         magic-link / OAuth return
  api/export/            CSV export
components/
  ui/                    shadcn/ui primitives restyled to the design tokens
  layout/                sidebar, top bar, mobile tab bar, ⌘K menu, bell, user menu
  features/              dashboard, tasks, calendar, charts, settings, documents, onboarding
  shared/                page header, empty state, skeletons
lib/
  actions/               Server Actions (mutations), all Zod-validated
  data/                  server-side reads
  supabase/              server, browser, proxy and admin clients
  tasks/ instances/      schedule maths and status rules shared by client and server
  utils/                 dates, money formatting, helpers
supabase/
  migrations/            SQL, run in order
  functions/             send-reminders Edge Function (scaffold)
scripts/                 seed.ts, verify-rls.ts
types/                   database types + domain aliases
proxy.ts                 session refresh + route protection (Next 16's name for middleware)
```

### Design system
All colours are CSS variables in `app/globals.css` (`:root` for light, `.dark` for dark), exposed
to Tailwind through `@theme inline`. Use the semantic classes (`text-body`, `text-meta`, `surface`,
`bg-status-paid-bg`, `bg-brand-gradient`, `bg-chart-accent`), never raw hex. Chart colours were
checked with a colour-blindness / contrast validator in both themes. Text tokens meet WCAG AA on
every surface they're used on. Lists use container queries, so rows adapt to the width they're
given (for example the calendar's day panel), not just the window.

---

## Email reminders (to finish)
`supabase/functions/send-reminders/` is a ready-to-deploy Edge Function that works out which bills
need a reminder today (each bill's `reminder_days_before`, in each user's timezone). **Sending email
is a TODO**: plug in a provider (Resend, Postmark…). Setup and the `pg_cron` schedule are in
[`supabase/functions/send-reminders/README.md`](supabase/functions/send-reminders/README.md).

---

## Regenerating database types
`types/database.ts` mirrors the schema. After schema changes:
```bash
npx supabase login
npx supabase gen types typescript --project-id <project-ref> --schema public > types/database.ts
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm` not recognised in the VS Code terminal | Node was installed after VS Code opened. Restart VS Code |
| Login page says "Finish setup to sign in" | `.env.local` is missing or has placeholder values. Fix it and restart `npm run dev` |
| "That sign-in link has expired" | Request a new link, and open it in the same browser you requested it from |
| No email arrives | The free Supabase plan limits auth emails per hour. Wait a few minutes; check spam |
| Pages error with "relation … does not exist" | The SQL migrations haven't been run. See step 5 |
| Supabase project paused | Free projects pause after inactivity. Click **Restore** in the Supabase dashboard |
| "Another next dev server is already running" | Stop the other one (Ctrl+C in its terminal) or use the URL it prints |
