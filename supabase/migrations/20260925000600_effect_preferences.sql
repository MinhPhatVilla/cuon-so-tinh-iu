-- Phase 9: each member's animation preference, favorites, and twenty recent effects.
create table public.effect_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  motion_mode text not null default 'system' check (motion_mode in ('system', 'full', 'reduced')),
  favorite_codes integer[] not null default '{}',
  recent_codes integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (coalesce(pg_catalog.array_length(favorite_codes, 1), 0) <= 50),
  check (coalesce(pg_catalog.array_length(recent_codes, 1), 0) <= 20)
);
alter table public.effect_preferences enable row level security;
revoke all on public.effect_preferences from anon, authenticated;
grant select on public.effect_preferences to authenticated;
create policy effect_preferences_read_self on public.effect_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_effect_motion(p_mode text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.couple_members where user_id = v_user) then
    raise exception 'not a couple member' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('system', 'full', 'reduced') then
    raise exception 'invalid motion mode' using errcode = '22023';
  end if;
  insert into public.effect_preferences(user_id, motion_mode)
    values (v_user, p_mode)
    on conflict (user_id) do update set motion_mode = excluded.motion_mode, updated_at = now();
  return p_mode;
end;
$$;
revoke all on function public.set_effect_motion(text) from public;
grant execute on function public.set_effect_motion(text) to authenticated;

create or replace function public.toggle_effect_favorite(p_code integer)
returns integer[] language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_favorites integer[];
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.couple_members where user_id = v_user) then
    raise exception 'not a couple member' using errcode = '42501';
  end if;
  if p_code is null or p_code not between 1 and 1000 then
    raise exception 'invalid effect code' using errcode = '22023';
  end if;
  insert into public.effect_preferences(user_id) values (v_user) on conflict (user_id) do nothing;
  select favorite_codes into v_favorites from public.effect_preferences where user_id = v_user for update;
  if p_code = any(v_favorites) then
    v_favorites := pg_catalog.array_remove(v_favorites, p_code);
  elsif coalesce(pg_catalog.array_length(v_favorites, 1), 0) < 50 then
    v_favorites := pg_catalog.array_append(v_favorites, p_code);
  else
    raise exception 'favorite limit reached' using errcode = '22023';
  end if;
  update public.effect_preferences set favorite_codes = v_favorites, updated_at = now() where user_id = v_user;
  return v_favorites;
end;
$$;
revoke all on function public.toggle_effect_favorite(integer) from public;
grant execute on function public.toggle_effect_favorite(integer) to authenticated;

create or replace function public.record_effect(p_code integer)
returns integer[] language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_recent integer[];
  v_count integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.couple_members where user_id = v_user) then
    raise exception 'not a couple member' using errcode = '42501';
  end if;
  if p_code is null or p_code not between 1 and 1000 then
    raise exception 'invalid effect code' using errcode = '22023';
  end if;
  insert into public.effect_preferences(user_id) values (v_user) on conflict (user_id) do nothing;
  select recent_codes into v_recent from public.effect_preferences where user_id = v_user for update;
  v_recent := pg_catalog.array_append(pg_catalog.array_remove(v_recent, p_code), p_code);
  v_count := coalesce(pg_catalog.array_length(v_recent, 1), 0);
  if v_count > 20 then v_recent := v_recent[(v_count - 19):v_count]; end if;
  update public.effect_preferences set recent_codes = v_recent, updated_at = now() where user_id = v_user;
  return v_recent;
end;
$$;
revoke all on function public.record_effect(integer) from public;
grant execute on function public.record_effect(integer) to authenticated;
