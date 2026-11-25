-- =====================================================================
-- Lifeline · 0001 · Core schema, constraints, RLS
-- =====================================================================
-- Every table carries id, user_id, created_at, updated_at, and Row Level
-- Security so a user can only ever touch their own rows.
-- Cross-table foreign keys are composite (id, user_id) so a row can never
-- point at another user's data, even with a guessed UUID.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.recurrence_type as enum ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time');

-- due_soon / overdue are part of the public vocabulary but are DERIVED
-- (see task_instance_details). Only upcoming / paid / skipped are stored.
create type public.instance_status as enum ('upcoming', 'due_soon', 'overdue', 'paid', 'skipped');

create type public.insight_type as enum ('summary', 'anomaly', 'suggestion');

-- ---------- Shared trigger: updated_at ---------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- profiles --------------------------------------------------
create table public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users (id) on delete cascade,
  display_name         text check (char_length(display_name) <= 80),
  currency             text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone             text not null default 'UTC',
  monthly_budget       numeric(12, 2) check (monthly_budget is null or monthly_budget >= 0),
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Reject unknown IANA zones up front so date math downstream never fails.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform now() at time zone new.timezone;
  exception when others then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- ---------- categories ------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  icon       text not null default 'circle-ellipsis' check (icon ~ '^[a-z0-9-]{1,40}$'),
  color      text not null default 'slate'
             check (color in ('indigo', 'sky', 'teal', 'emerald', 'amber', 'orange', 'rose', 'pink', 'violet', 'slate')),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index categories_user_name_key on public.categories (user_id, lower(name));

-- ---------- tasks (recurring obligation template) ---------------------
create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  category_id          uuid,
  title                text not null check (char_length(btrim(title)) between 1 and 120),
  payee                text check (char_length(payee) <= 120),
  amount               numeric(12, 2) not null default 0 check (amount >= 0),
  currency             text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  is_variable_amount   boolean not null default false,
  recurrence           public.recurrence_type not null default 'monthly',
  due_day              smallint not null check (due_day between 1 and 31),
  -- Anchor month for quarterly / half_yearly / yearly schedules.
  due_month            smallint check (due_month between 1 and 12),
  start_date           date not null default current_date,
  end_date             date,
  payment_method       text check (char_length(payment_method) <= 60),
  -- Last 4 digits ONLY. Full account numbers are never stored.
  account_reference    text check (account_reference ~ '^[0-9]{4}$'),
  autopay              boolean not null default false,
  reminder_days_before integer[] not null default '{3,1}'
                       check (
                         cardinality(reminder_days_before) <= 5
                         and 0 <= all (reminder_days_before)
                         and 60 >= all (reminder_days_before)
                       ),
  notes                text check (char_length(notes) <= 2000),
  is_archived          boolean not null default false,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  check (end_date is null or end_date >= start_date),
  check (recurrence <> 'yearly' or due_month is not null)
);

-- ---------- task_instances (one per occurrence per period) ------------
create table public.task_instances (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  task_id             uuid not null,
  period              date not null check (extract(day from period) = 1),
  due_date            date not null,
  amount_due          numeric(12, 2) not null default 0 check (amount_due >= 0),
  amount_paid         numeric(12, 2) check (amount_paid >= 0),
  status              public.instance_status not null default 'upcoming'
                      check (status in ('upcoming', 'paid', 'skipped')),
  paid_at             timestamptz,
  confirmation_number text check (char_length(confirmation_number) <= 80),
  receipt_path        text check (receipt_path is null or split_part(receipt_path, '/', 1) = user_id::text),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (task_id, period),
  unique (id, user_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  check (status <> 'paid' or paid_at is not null)
);

-- ---------- documents -------------------------------------------------
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  storage_path     text not null unique check (split_part(storage_path, '/', 1) = user_id::text),
  file_name        text not null check (char_length(file_name) between 1 and 255),
  mime_type        text not null,
  size_bytes       integer check (size_bytes >= 0),
  task_instance_id uuid,
  ai_extracted     jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (task_instance_id, user_id)
    references public.task_instances (id, user_id) on delete set null (task_instance_id)
);

-- ---------- ai_insights -----------------------------------------------
create table public.ai_insights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  period     date not null check (extract(day from period) = 1),
  type       public.insight_type not null,
  -- Dedupe key, e.g. the task id for an anomaly. 'default' for the summary.
  key        text not null default 'default',
  content    jsonb not null,
  dismissed  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period, type, key)
);

-- ---------- Indexes ---------------------------------------------------
create index categories_user_idx        on public.categories (user_id, sort_order);
create index tasks_user_active_idx      on public.tasks (user_id) where not is_archived;
create index tasks_category_idx         on public.tasks (category_id);
create index task_instances_period_idx  on public.task_instances (user_id, period);
create index task_instances_due_idx     on public.task_instances (user_id, due_date);
create index task_instances_task_idx    on public.task_instances (task_id);
create index documents_user_idx         on public.documents (user_id, created_at desc);
create index documents_instance_idx     on public.documents (task_instance_id);
create index ai_insights_user_period_idx on public.ai_insights (user_id, period);

-- ---------- updated_at triggers ---------------------------------------
create trigger set_updated_at before update on public.profiles       for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories     for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks          for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.task_instances for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.documents      for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ai_insights    for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- (select auth.uid()) is wrapped so Postgres evaluates it once per query.
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_instances enable row level security;
alter table public.documents      enable row level security;
alter table public.ai_insights    enable row level security;

-- profiles: created by trigger, never inserted or deleted by the client.
create policy "profiles: read own"   on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- categories
create policy "categories: read own"   on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "categories: insert own" on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "categories: update own" on public.categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories: delete own" on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

-- tasks
create policy "tasks: read own"   on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "tasks: insert own" on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "tasks: update own" on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks: delete own" on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- task_instances
create policy "task_instances: read own"   on public.task_instances for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "task_instances: insert own" on public.task_instances for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "task_instances: update own" on public.task_instances for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "task_instances: delete own" on public.task_instances for delete to authenticated
  using ((select auth.uid()) = user_id);

-- documents
create policy "documents: read own"   on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "documents: insert own" on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "documents: update own" on public.documents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "documents: delete own" on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ai_insights
create policy "ai_insights: read own"   on public.ai_insights for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "ai_insights: insert own" on public.ai_insights for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "ai_insights: update own" on public.ai_insights for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_insights: delete own" on public.ai_insights for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- Grants: signed-in users only; anon gets nothing -----------
revoke all on public.profiles, public.categories, public.tasks, public.task_instances,
              public.documents, public.ai_insights from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete
  on public.categories, public.tasks, public.task_instances, public.documents, public.ai_insights
  to authenticated;
