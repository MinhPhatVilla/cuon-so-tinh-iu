-- Phase 5: shared calendar events and in-app reminders.
-- Apply after 20260925000200_memories_photos.sql.
create table public.calendar_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null check (event_date between date '1900-01-01' and date '2100-12-31'),
  event_time time without time zone,
  title text not null check (char_length(title) between 1 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  kind text not null check (kind in ('anniversary', 'plan', 'reminder')),
  recurrence text not null default 'none' check (recurrence in ('none', 'yearly')),
  remind_days_before smallint not null default 1 check (remind_days_before between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_space_date on public.calendar_events(space_id, event_date);
create index calendar_events_yearly on public.calendar_events(space_id, recurrence)
  where recurrence = 'yearly';

alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to authenticated;

create policy calendar_events_read_members on public.calendar_events for select to authenticated
  using (private.is_couple_member(space_id));

create or replace function private.assert_calendar_event_fields(
  p_date date, p_time time without time zone, p_title text,
  p_note text, p_kind text, p_recurrence text, p_remind_days_before integer
) returns void language plpgsql set search_path = '' as $$
begin
  if p_date is null or p_date < date '1900-01-01' or p_date > date '2100-12-31'
    or p_title is null or char_length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_note is null or char_length(p_note) > 1000
    or p_kind is null or p_kind not in ('anniversary', 'plan', 'reminder')
    or p_recurrence is null or p_recurrence not in ('none', 'yearly')
    or p_remind_days_before is null or p_remind_days_before not between 0 and 30
  then
    raise exception 'invalid calendar event fields' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_calendar_event_fields(date,time without time zone,text,text,text,text,integer) from public;

create or replace function public.create_calendar_event(
  p_date date, p_time time without time zone, p_title text,
  p_note text, p_kind text, p_recurrence text, p_remind_days_before integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_space_id uuid;
  v_event_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform private.assert_calendar_event_fields(p_date, p_time, p_title, p_note, p_kind, p_recurrence, p_remind_days_before);
  select space_id into v_space_id from public.couple_members where user_id = v_user_id;
  if v_space_id is null then raise exception 'not a couple member' using errcode = '42501'; end if;

  insert into public.calendar_events(
    space_id, author_id, event_date, event_time, title, note, kind, recurrence, remind_days_before
  ) values (
    v_space_id, v_user_id, p_date, p_time, pg_catalog.btrim(p_title), p_note, p_kind, p_recurrence, p_remind_days_before
  ) returning id into v_event_id;
  return v_event_id;
end;
$$;
revoke all on function public.create_calendar_event(date,time without time zone,text,text,text,text,integer) from public;
grant execute on function public.create_calendar_event(date,time without time zone,text,text,text,text,integer) to authenticated;

create or replace function public.update_calendar_event(
  p_event_id uuid, p_date date, p_time time without time zone, p_title text,
  p_note text, p_kind text, p_recurrence text, p_remind_days_before integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_author_id uuid;
begin
  perform private.assert_calendar_event_fields(p_date, p_time, p_title, p_note, p_kind, p_recurrence, p_remind_days_before);
  select author_id into v_author_id from public.calendar_events where id = p_event_id for update;
  if v_author_id is null or v_author_id <> auth.uid() then
    raise exception 'calendar event not owned' using errcode = '42501';
  end if;
  update public.calendar_events set event_date = p_date, event_time = p_time,
    title = pg_catalog.btrim(p_title), note = p_note, kind = p_kind,
    recurrence = p_recurrence, remind_days_before = p_remind_days_before,
    updated_at = now()
  where id = p_event_id;
end;
$$;
revoke all on function public.update_calendar_event(uuid,date,time without time zone,text,text,text,text,integer) from public;
grant execute on function public.update_calendar_event(uuid,date,time without time zone,text,text,text,text,integer) to authenticated;

create or replace function public.delete_calendar_event(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_author_id uuid;
begin
  select author_id into v_author_id from public.calendar_events where id = p_event_id for update;
  if v_author_id is null or v_author_id <> auth.uid() then
    raise exception 'calendar event not owned' using errcode = '42501';
  end if;
  delete from public.calendar_events where id = p_event_id;
end;
$$;
revoke all on function public.delete_calendar_event(uuid) from public;
grant execute on function public.delete_calendar_event(uuid) to authenticated;
