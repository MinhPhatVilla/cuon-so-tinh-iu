-- Phase 6: second perspective and private notes on the back of photos.
-- Apply after 20260925000300_calendar_events.sql.

alter table public.photos
  add column secret_note text not null default '' check (char_length(secret_note) <= 500);

create table public.memory_perspectives (
  memory_id uuid not null references public.memories(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  story text not null check (char_length(story) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (memory_id, author_id)
);
create index memory_perspectives_author on public.memory_perspectives(author_id);

alter table public.memory_perspectives enable row level security;
revoke all on public.memory_perspectives from anon, authenticated;
grant select on public.memory_perspectives to authenticated;
create policy memory_perspectives_read_members on public.memory_perspectives for select to authenticated
  using (private.can_read_memory(memory_id));

create or replace function public.save_memory_perspective(p_memory_id uuid, p_story text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_memory public.memories%rowtype;
  v_user_id uuid := auth.uid();
begin
  if p_story is null or char_length(pg_catalog.btrim(p_story)) not between 1 and 3000 then
    raise exception 'invalid perspective' using errcode = '22023';
  end if;
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_user_id is null or v_memory.status <> 'published'
    or v_memory.author_id = v_user_id or not private.is_couple_member(v_memory.space_id) then
    raise exception 'perspective not allowed' using errcode = '42501';
  end if;
  insert into public.memory_perspectives(memory_id, author_id, story)
    values (p_memory_id, v_user_id, pg_catalog.btrim(p_story))
    on conflict (memory_id, author_id) do update set story = excluded.story, updated_at = now();
end;
$$;
revoke all on function public.save_memory_perspective(uuid,text) from public;
grant execute on function public.save_memory_perspective(uuid,text) to authenticated;

create or replace function public.delete_memory_perspective(p_memory_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_memory public.memories%rowtype;
  v_user_id uuid := auth.uid();
begin
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_user_id is null or v_memory.status <> 'published'
    or v_memory.author_id = v_user_id or not private.is_couple_member(v_memory.space_id) then
    raise exception 'perspective not allowed' using errcode = '42501';
  end if;
  delete from public.memory_perspectives where memory_id = p_memory_id and author_id = v_user_id;
end;
$$;
revoke all on function public.delete_memory_perspective(uuid) from public;
grant execute on function public.delete_memory_perspective(uuid) to authenticated;

create or replace function public.update_photo_secret_note(p_photo_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_photo public.photos%rowtype;
begin
  if p_note is null or char_length(p_note) > 500 then
    raise exception 'invalid photo note' using errcode = '22023';
  end if;
  select * into v_photo from public.photos where id = p_photo_id for update;
  if not found or v_photo.created_by <> auth.uid() or not private.is_couple_member(v_photo.space_id) then
    raise exception 'photo note not allowed' using errcode = '42501';
  end if;
  update public.photos set secret_note = pg_catalog.btrim(p_note) where id = p_photo_id;
end;
$$;
revoke all on function public.update_photo_secret_note(uuid,text) from public;
grant execute on function public.update_photo_secret_note(uuid,text) to authenticated;
