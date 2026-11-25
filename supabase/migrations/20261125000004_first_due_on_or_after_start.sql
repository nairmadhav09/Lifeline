-- =====================================================================
-- Lifeline · 0004 · A task's first occurrence is the first due date on or
-- after its start date.
-- =====================================================================
-- Before: a bill "due on the 5th" created on the 25th got an instance for
-- the 5th of the current month, which instantly showed as overdue.
-- After: it first comes due next month. To include the current month,
-- set the start date earlier.
-- =====================================================================

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
    and public.instance_due_date(m.period, t.due_day) >= t.start_date
    and (t.end_date is null or public.instance_due_date(m.period, t.due_day) <= t.end_date)
    and public.task_occurs_in(t.recurrence, t.due_month, t.start_date, m.period)
  on conflict (task_id, period) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke execute on function public.generate_task_instances(uuid, date, integer, uuid) from public, anon, authenticated;
grant execute on function public.generate_task_instances(uuid, date, integer, uuid) to service_role;
