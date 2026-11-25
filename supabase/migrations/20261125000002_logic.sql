-- =====================================================================
-- Lifeline · 0002 · New-user setup, instance generation, derived status
-- =====================================================================

-- ---------- Default categories ----------------------------------------
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, icon, color, is_default, sort_order)
  values
    (p_user_id, 'Housing',       'house',           'indigo',  true, 10),
    (p_user_id, 'Utilities',     'zap',             'amber',   true, 20),
    (p_user_id, 'Insurance',     'shield-check',    'teal',    true, 30),
    (p_user_id, 'Taxes',         'landmark',        'rose',    true, 40),
    (p_user_id, 'Subscriptions', 'repeat',          'violet',  true, 50),
    (p_user_id, 'Loans & EMIs',  'hand-coins',      'orange',  true, 60),
    (p_user_id, 'Credit Cards',  'credit-card',     'sky',     true, 70),
    (p_user_id, 'Healthcare',    'heart-pulse',     'pink',    true, 80),
    (p_user_id, 'Education',     'graduation-cap',  'emerald', true, 90),
    (p_user_id, 'Other',         'circle-ellipsis', 'slate',   true, 100)
  on conflict (user_id, (lower(name))) do nothing;
$$;

-- ---------- New user → profile + categories ---------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ), 80)
  )
  on conflict (user_id) do nothing;

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration ran.
insert into public.profiles (user_id, display_name)
select u.id,
       left(coalesce(
         nullif(u.raw_user_meta_data ->> 'full_name', ''),
         nullif(u.raw_user_meta_data ->> 'name', ''),
         split_part(u.email, '@', 1)
       ), 80)
from auth.users u
on conflict (user_id) do nothing;

select public.seed_default_categories(u.id) from auth.users u;

-- ---------- Schedule helpers (pure) -----------------------------------

-- Does a task with this schedule have an occurrence in the given month?
create or replace function public.task_occurs_in(
  p_recurrence public.recurrence_type,
  p_due_month  smallint,
  p_start_date date,
  p_period     date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_recurrence
    when 'monthly' then true
    when 'quarterly' then
      mod(extract(month from p_period)::int - coalesce(p_due_month, extract(month from p_start_date)::int) + 12, 3) = 0
    when 'half_yearly' then
      mod(extract(month from p_period)::int - coalesce(p_due_month, extract(month from p_start_date)::int) + 12, 6) = 0
    when 'yearly' then
      extract(month from p_period)::int = coalesce(p_due_month, extract(month from p_start_date)::int)
    when 'one_time' then
      date_trunc('month', p_start_date::timestamp)::date = p_period
  end;
$$;

-- Due date inside a month, clamping day 31 → 30/28/29 as needed.
create or replace function public.instance_due_date(p_period date, p_due_day smallint)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_period + (
    least(p_due_day::int, extract(day from (p_period + interval '1 month' - interval '1 day'))::int) - 1
  );
$$;

-- The user's local "today", according to their profile timezone.
create or replace function public.user_local_today(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.user_id = p_user_id),
    'UTC'
  ))::date;
$$;

-- ---------- Idempotent instance generation ----------------------------
-- Creates missing task_instances for p_months months starting at p_from's
-- month. Safe to call repeatedly: (task_id, period) is unique.
-- Internal: callable by the service role only. Users go through
-- ensure_task_instances(), which is pinned to auth.uid().
create or replace function public.generate_task_instances(
  p_user_id uuid,
  p_from    date,
  p_months  integer default 2,
  p_task_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if p_months < 1 or p_months > 24 then
    raise exception 'p_months must be between 1 and 24' using errcode = '22023';
  end if;

  insert into public.task_instances (user_id, task_id, period, due_date, amount_due)
  select t.user_id,
         t.id,
         m.period,
         public.instance_due_date(m.period, t.due_day),
         t.amount
  from public.tasks t
  cross join lateral (
    select (date_trunc('month', p_from::timestamp) + make_interval(months => i))::date as period
    from generate_series(0, p_months - 1) as i
  ) m
  where t.user_id = p_user_id
    and not t.is_archived
    and (p_task_id is null or t.id = p_task_id)
    and m.period >= date_trunc('month', t.start_date::timestamp)::date
    and (t.end_date is null or public.instance_due_date(m.period, t.due_day) <= t.end_date)
    and public.task_occurs_in(t.recurrence, t.due_month, t.start_date, m.period)
  on conflict (task_id, period) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Called on dashboard load. Fills the current + next month (or the month
-- the user navigated to) for the signed-in user only.
create or replace function public.ensure_task_instances(
  p_from   date default null,
  p_months integer default 2
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date;
  v_from  date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_today := public.user_local_today(v_uid);
  v_from  := coalesce(p_from, v_today);

  -- Bound how far a client can ask us to materialise.
  if v_from < (v_today - interval '24 months') or v_from > (v_today + interval '24 months') then
    raise exception 'p_from is out of range' using errcode = '22023';
  end if;

  return public.generate_task_instances(v_uid, v_from, least(greatest(p_months, 1), 12));
end;
$$;

-- ---------- Keep instances in sync with their task --------------------
create or replace function public.tasks_sync_instances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today          date := public.user_local_today(new.user_id);
  v_current_period date := date_trunc('month', v_today::timestamp)::date;
begin
  if tg_op = 'UPDATE' then
    -- Archived: stop tracking. Drop every unpaid, unskipped occurrence;
    -- paid history stays for charts and exports.
    if new.is_archived and not old.is_archived then
      delete from public.task_instances
      where task_id = new.id and status = 'upcoming';
      return new;
    end if;

    -- Schedule or amount changed (or un-archived): rebuild open occurrences
    -- from this month on. Paid / skipped rows are never touched.
    if (new.recurrence, new.due_day, new.due_month, new.start_date, new.end_date, new.amount)
         is distinct from
       (old.recurrence, old.due_day, old.due_month, old.start_date, old.end_date, old.amount)
       or (old.is_archived and not new.is_archived) then
      delete from public.task_instances
      where task_id = new.id and status = 'upcoming' and period >= v_current_period;
    else
      return new;
    end if;
  end if;

  if not new.is_archived then
    perform public.generate_task_instances(new.user_id, v_today, 2, new.id);
  end if;
  return new;
end;
$$;

create trigger tasks_sync_instances
  after insert or update on public.tasks
  for each row execute function public.tasks_sync_instances();

-- ---------- Derived status view ---------------------------------------
-- due_soon (within 3 days) and overdue are computed at read time against
-- the user's local date, so they are never stale.
-- security_invoker = true → the caller's RLS applies to every base table.
create or replace view public.task_instance_details
with (security_invoker = true)
as
select
  ti.id,
  ti.user_id,
  ti.task_id,
  ti.period,
  ti.due_date,
  ti.amount_due,
  ti.amount_paid,
  case
    when ti.status in ('paid', 'skipped') then ti.status
    when ti.due_date < d.today            then 'overdue'::public.instance_status
    when ti.due_date <= d.today + 3       then 'due_soon'::public.instance_status
    else 'upcoming'::public.instance_status
  end                       as status,
  (ti.due_date - d.today)   as days_until_due,
  ti.paid_at,
  ti.confirmation_number,
  ti.receipt_path,
  ti.created_at,
  ti.updated_at,
  t.title,
  t.payee,
  t.currency,
  t.is_variable_amount,
  t.recurrence,
  t.autopay,
  t.payment_method,
  t.account_reference,
  t.is_archived             as task_is_archived,
  t.category_id,
  c.name                    as category_name,
  c.icon                    as category_icon,
  c.color                   as category_color
from public.task_instances ti
join public.tasks t           on t.id = ti.task_id
left join public.categories c on c.id = t.category_id
left join public.profiles p   on p.user_id = ti.user_id
cross join lateral (
  select (now() at time zone coalesce(p.timezone, 'UTC'))::date as today
) d;

-- ---------- Function & view privileges --------------------------------
revoke all on public.task_instance_details from anon;
grant select on public.task_instance_details to authenticated;

revoke execute on function public.seed_default_categories(uuid)                     from public, anon, authenticated;
revoke execute on function public.handle_new_user()                                  from public, anon, authenticated;
revoke execute on function public.user_local_today(uuid)                             from public, anon, authenticated;
revoke execute on function public.generate_task_instances(uuid, date, integer, uuid) from public, anon, authenticated;
revoke execute on function public.tasks_sync_instances()                             from public, anon, authenticated;
revoke execute on function public.ensure_task_instances(date, integer)               from public, anon;

grant execute on function public.seed_default_categories(uuid)                     to service_role;
grant execute on function public.generate_task_instances(uuid, date, integer, uuid) to service_role;
grant execute on function public.ensure_task_instances(date, integer)               to authenticated;
