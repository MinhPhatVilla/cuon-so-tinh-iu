-- Phase 4: private photo memories. Apply after 20260925000100_couple_access.sql.
create table public.places (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  latitude double precision,
  longitude double precision,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.memories (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  memory_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  story text not null default '' check (char_length(story) <= 3000),
  place_id uuid references public.places(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_space_date on public.memories(space_id, memory_date desc, created_at desc);
create index memories_author_drafts on public.memories(author_id, updated_at desc) where status = 'draft';

create table public.photos (
  id uuid primary key,
  memory_id uuid not null references public.memories(id) on delete cascade,
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  original_path text not null unique,
  display_path text not null unique,
  original_mime text not null check (original_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  sort_order integer not null check (sort_order between 0 and 7),
  caption text not null default '' check (char_length(caption) <= 240),
  created_at timestamptz not null default now(),
  constraint photos_memory_position unique (memory_id, sort_order) deferrable initially deferred
);
create index photos_memory_order on public.photos(memory_id, sort_order);

create table public.pending_photo_deletes (
  path text primary key,
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.places enable row level security;
alter table public.memories enable row level security;
alter table public.photos enable row level security;
alter table public.pending_photo_deletes enable row level security;
revoke all on public.places, public.memories, public.photos, public.pending_photo_deletes from anon, authenticated;
grant select on public.places, public.memories, public.photos to authenticated;

create or replace function private.can_read_memory(p_memory_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memories m
    where m.id = p_memory_id
      and private.is_couple_member(m.space_id)
      and (m.status = 'published' or m.author_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_read_memory(uuid) from public;
grant execute on function private.can_read_memory(uuid) to authenticated;

create or replace function private.can_read_place(p_place_id uuid, p_space_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_couple_member(p_space_id) and exists (
    select 1 from public.memories m
    where m.place_id = p_place_id and m.space_id = p_space_id
      and (m.status = 'published' or m.author_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_read_place(uuid,uuid) from public;
grant execute on function private.can_read_place(uuid,uuid) to authenticated;

create policy memories_read_members on public.memories for select to authenticated
  using (private.is_couple_member(space_id) and (status = 'published' or author_id = (select auth.uid())));
create policy places_read_members on public.places for select to authenticated
  using (private.can_read_place(id, space_id));
create policy photos_read_memory on public.photos for select to authenticated
  using (private.can_read_memory(memory_id));

create or replace function private.assert_memory_fields(
  p_title text, p_story text, p_date date,
  p_place_name text, p_latitude double precision, p_longitude double precision
) returns void language plpgsql set search_path = '' as $$
begin
  if p_title is null or char_length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_story is null or char_length(p_story) > 3000
    or p_date is null or p_date < date '1900-01-01' or p_date > (current_date + 1)
    or (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and (p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180))
    or (p_place_name is not null and char_length(pg_catalog.btrim(p_place_name)) > 120)
    or ((p_latitude is not null or p_longitude is not null) and nullif(pg_catalog.btrim(p_place_name), '') is null)
  then
    raise exception 'invalid memory fields' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_memory_fields(text,text,date,text,double precision,double precision) from public;

create or replace function public.create_memory_draft(
  p_title text, p_story text, p_date date,
  p_place_name text default null, p_latitude double precision default null, p_longitude double precision default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_space_id uuid;
  v_place_id uuid;
  v_memory_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform private.assert_memory_fields(p_title, p_story, p_date, p_place_name, p_latitude, p_longitude);
  select space_id into v_space_id from public.couple_members where user_id = v_user_id;
  if v_space_id is null then raise exception 'not a couple member' using errcode = '42501'; end if;

  if nullif(pg_catalog.btrim(p_place_name), '') is not null then
    insert into public.places(space_id, name, latitude, longitude, created_by)
    values (v_space_id, pg_catalog.btrim(p_place_name), p_latitude, p_longitude, v_user_id)
    returning id into v_place_id;
  end if;
  insert into public.memories(space_id, author_id, memory_date, title, story, place_id)
  values (v_space_id, v_user_id, p_date, pg_catalog.btrim(p_title), p_story, v_place_id)
  returning id into v_memory_id;
  return v_memory_id;
end;
$$;
revoke all on function public.create_memory_draft(text,text,date,text,double precision,double precision) from public;
grant execute on function public.create_memory_draft(text,text,date,text,double precision,double precision) to authenticated;

create or replace function public.update_memory(
  p_memory_id uuid, p_title text, p_story text, p_date date,
  p_place_name text default null, p_latitude double precision default null, p_longitude double precision default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_memory public.memories%rowtype;
  v_place_id uuid;
begin
  perform private.assert_memory_fields(p_title, p_story, p_date, p_place_name, p_latitude, p_longitude);
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_memory.author_id <> auth.uid() then
    raise exception 'memory not owned' using errcode = '42501';
  end if;
  v_place_id := v_memory.place_id;
  if nullif(pg_catalog.btrim(p_place_name), '') is null then
    v_place_id := null;
  elsif v_place_id is null then
    insert into public.places(space_id, name, latitude, longitude, created_by)
    values (v_memory.space_id, pg_catalog.btrim(p_place_name), p_latitude, p_longitude, v_memory.author_id)
    returning id into v_place_id;
  else
    update public.places set name = pg_catalog.btrim(p_place_name), latitude = p_latitude, longitude = p_longitude
    where id = v_place_id;
  end if;
  update public.memories set title = pg_catalog.btrim(p_title), story = p_story,
    memory_date = p_date, place_id = v_place_id, updated_at = now()
  where id = p_memory_id;
  if v_memory.place_id is not null and v_place_id is null then
    delete from public.places where id = v_memory.place_id;
  end if;
end;
$$;
revoke all on function public.update_memory(uuid,text,text,date,text,double precision,double precision) from public;
grant execute on function public.update_memory(uuid,text,text,date,text,double precision,double precision) to authenticated;

create or replace function public.attach_memory_photo(
  p_memory_id uuid, p_photo_id uuid, p_extension text, p_sort_order integer
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_memory public.memories%rowtype;
  v_prefix text;
  v_original text;
  v_display text;
  v_mime text;
begin
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_memory.author_id <> auth.uid() then
    raise exception 'memory not owned' using errcode = '42501';
  end if;
  if p_photo_id is null or p_sort_order not between 0 and 7 or p_extension not in ('jpg', 'png', 'webp', 'heic', 'heif') then
    raise exception 'invalid photo' using errcode = '22023';
  end if;
  if (select count(*) from public.photos where memory_id = p_memory_id) >= 8 then
    raise exception 'photo limit reached' using errcode = '23514';
  end if;
  v_prefix := v_memory.space_id::text || '/' || v_memory.author_id::text || '/' || p_memory_id::text || '/' || p_photo_id::text;
  v_original := v_prefix || '/original.' || p_extension;
  v_display := v_prefix || '/display.webp';
  if not exists (select 1 from storage.objects where bucket_id = 'couple-photos' and name = v_original)
    or not exists (select 1 from storage.objects where bucket_id = 'couple-photos' and name = v_display) then
    raise exception 'photo upload incomplete' using errcode = '22023';
  end if;
  v_mime := case p_extension when 'jpg' then 'image/jpeg' when 'png' then 'image/png'
    when 'heic' then 'image/heic' when 'heif' then 'image/heif' else 'image/webp' end;
  insert into public.photos(id, memory_id, space_id, created_by, original_path, display_path, original_mime, sort_order)
  values (p_photo_id, p_memory_id, v_memory.space_id, v_memory.author_id, v_original, v_display, v_mime, p_sort_order);
  update public.memories set updated_at = now() where id = p_memory_id;
end;
$$;
revoke all on function public.attach_memory_photo(uuid,uuid,text,integer) from public;
grant execute on function public.attach_memory_photo(uuid,uuid,text,integer) to authenticated;

create or replace function public.reorder_memory_photos(p_memory_id uuid, p_photo_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_author_id uuid;
  v_count integer;
  v_position integer;
begin
  select author_id into v_author_id from public.memories where id = p_memory_id for update;
  if v_author_id is null or v_author_id <> auth.uid() then
    raise exception 'memory not owned' using errcode = '42501';
  end if;
  select count(*) into v_count from public.photos where memory_id = p_memory_id;
  if p_photo_ids is null or pg_catalog.array_length(p_photo_ids, 1) is distinct from v_count
    or (select count(distinct x) from pg_catalog.unnest(p_photo_ids) as x) <> v_count
    or exists (select 1 from pg_catalog.unnest(p_photo_ids) as x
      where not exists (select 1 from public.photos p where p.id = x and p.memory_id = p_memory_id))
  then
    raise exception 'invalid photo order' using errcode = '22023';
  end if;
  for v_position in 1..v_count loop
    update public.photos set sort_order = v_position - 1 where id = p_photo_ids[v_position];
  end loop;
  update public.memories set updated_at = now() where id = p_memory_id;
end;
$$;
revoke all on function public.reorder_memory_photos(uuid,uuid[]) from public;
grant execute on function public.reorder_memory_photos(uuid,uuid[]) to authenticated;

create or replace function public.publish_memory(p_memory_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_memory public.memories%rowtype;
begin
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_memory.author_id <> auth.uid() then
    raise exception 'memory not owned' using errcode = '42501';
  end if;
  if not exists (select 1 from public.photos where memory_id = p_memory_id) then
    raise exception 'at least one photo required' using errcode = '23514';
  end if;
  update public.memories set status = 'published', updated_at = now() where id = p_memory_id;
end;
$$;
revoke all on function public.publish_memory(uuid) from public;
grant execute on function public.publish_memory(uuid) to authenticated;

create or replace function public.remove_memory_photo(p_photo_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_photo public.photos%rowtype;
  v_memory public.memories%rowtype;
  v_memory_id uuid;
begin
  select memory_id into v_memory_id from public.photos where id = p_photo_id;
  if v_memory_id is null then raise exception 'photo not found' using errcode = '22023'; end if;
  select * into v_memory from public.memories where id = v_memory_id for update;
  select * into v_photo from public.photos where id = p_photo_id for update;
  if not found then raise exception 'photo not found' using errcode = '22023'; end if;
  if v_memory.author_id <> auth.uid() then raise exception 'memory not owned' using errcode = '42501'; end if;
  if v_memory.status = 'published' and (select count(*) from public.photos where memory_id = v_memory.id) <= 1 then
    raise exception 'published memory needs a photo' using errcode = '23514';
  end if;
  insert into public.pending_photo_deletes(path, space_id, owner_id)
  values (v_photo.original_path, v_photo.space_id, v_photo.created_by),
         (v_photo.display_path, v_photo.space_id, v_photo.created_by)
  on conflict (path) do nothing;
  delete from public.photos where id = p_photo_id;
  update public.memories set updated_at = now() where id = v_memory.id;
end;
$$;
revoke all on function public.remove_memory_photo(uuid) from public;
grant execute on function public.remove_memory_photo(uuid) to authenticated;

create or replace function public.delete_memory(p_memory_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_memory public.memories%rowtype;
begin
  select * into v_memory from public.memories where id = p_memory_id for update;
  if not found or v_memory.author_id <> auth.uid() then
    raise exception 'memory not owned' using errcode = '42501';
  end if;
  insert into public.pending_photo_deletes(path, space_id, owner_id)
  select path, v_memory.space_id, v_memory.author_id from (
    select original_path as path from public.photos where memory_id = p_memory_id
    union all
    select display_path from public.photos where memory_id = p_memory_id
  ) paths on conflict (path) do nothing;
  delete from public.memories where id = p_memory_id;
  if v_memory.place_id is not null then delete from public.places where id = v_memory.place_id; end if;
end;
$$;
revoke all on function public.delete_memory(uuid) from public;
grant execute on function public.delete_memory(uuid) to authenticated;

create or replace function public.list_pending_photo_deletes()
returns table(path text) language sql security definer set search_path = '' as $$
  select d.path from public.pending_photo_deletes d
  where d.owner_id = (select auth.uid()) and private.is_couple_member(d.space_id)
  order by d.created_at limit 100;
$$;
revoke all on function public.list_pending_photo_deletes() from public;
grant execute on function public.list_pending_photo_deletes() to authenticated;

create or replace function public.finish_photo_deletes(p_paths text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.pending_photo_deletes d
  where d.owner_id = auth.uid() and d.path = any(p_paths);
end;
$$;
revoke all on function public.finish_photo_deletes(text[]) from public;
grant execute on function public.finish_photo_deletes(text[]) to authenticated;

create or replace function public.queue_orphan_photo_cleanup(p_paths text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_path text;
  v_space_id uuid;
begin
  if auth.uid() is null or p_paths is null or pg_catalog.array_length(p_paths, 1) > 16 then
    raise exception 'invalid cleanup request' using errcode = '22023';
  end if;
  for v_path in select pg_catalog.unnest(p_paths) loop
    select cm.space_id into v_space_id from public.couple_members cm
    where cm.user_id = auth.uid() and cm.space_id::text = pg_catalog.split_part(v_path, '/', 1);
    if v_space_id is null or pg_catalog.split_part(v_path, '/', 2) <> auth.uid()::text
      or exists (select 1 from public.photos p where p.original_path = v_path or p.display_path = v_path) then
      raise exception 'photo cleanup not allowed' using errcode = '42501';
    end if;
    insert into public.pending_photo_deletes(path, space_id, owner_id)
    values (v_path, v_space_id, auth.uid()) on conflict (path) do nothing;
    v_space_id := null;
  end loop;
end;
$$;
revoke all on function public.queue_orphan_photo_cleanup(text[]) from public;
grant execute on function public.queue_orphan_photo_cleanup(text[]) to authenticated;

create or replace function private.can_upload_couple_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and pg_catalog.array_length(pg_catalog.string_to_array(p_name, '/'), 1) = 5
    and pg_catalog.split_part(p_name, '/', 2) = (select auth.uid())::text
    and pg_catalog.split_part(p_name, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and pg_catalog.split_part(p_name, '/', 5) in ('original.jpg','original.png','original.webp','original.heic','original.heif','display.webp')
    and exists (
      select 1 from public.couple_members cm
      where cm.user_id = (select auth.uid())
        and cm.space_id::text = pg_catalog.split_part(p_name, '/', 1)
    )
    and exists (
      select 1 from public.memories m
      where m.id::text = pg_catalog.split_part(p_name, '/', 3)
        and m.space_id::text = pg_catalog.split_part(p_name, '/', 1)
        and m.author_id = (select auth.uid())
    )
    and (select count(*) from storage.objects o where o.bucket_id = 'couple-photos'
      and o.name like pg_catalog.split_part(p_name, '/', 1) || '/' || pg_catalog.split_part(p_name, '/', 2) || '/' || pg_catalog.split_part(p_name, '/', 3) || '/%') < 16;
$$;
revoke all on function private.can_upload_couple_photo(text) from public;
grant execute on function private.can_upload_couple_photo(text) to authenticated;

create or replace function private.can_remove_couple_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and pg_catalog.split_part(p_name, '/', 2) = (select auth.uid())::text
    and exists (
      select 1 from public.couple_members m
      where m.user_id = (select auth.uid())
        and m.space_id::text = pg_catalog.split_part(p_name, '/', 1)
    );
$$;
revoke all on function private.can_remove_couple_photo(text) from public;
grant execute on function private.can_remove_couple_photo(text) to authenticated;

-- A partner can read published photos; the author can read drafts and pending cleanup objects.
create or replace function private.can_read_couple_photo(p_object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.couple_members cm
      where cm.user_id = (select auth.uid())
        and cm.space_id::text = pg_catalog.split_part(p_object_name, '/', 1)
    )
    and (
      pg_catalog.split_part(p_object_name, '/', 2) = (select auth.uid())::text
      or exists (
        select 1 from public.memories m
        where m.id::text = pg_catalog.split_part(p_object_name, '/', 3)
          and m.space_id::text = pg_catalog.split_part(p_object_name, '/', 1)
          and m.status = 'published'
      )
    );
$$;

create policy couple_photos_upload_author on storage.objects for insert to authenticated
  with check (bucket_id = 'couple-photos' and private.can_upload_couple_photo(name));
create policy couple_photos_delete_author on storage.objects for delete to authenticated
  using (bucket_id = 'couple-photos' and private.can_remove_couple_photo(name));

update storage.buckets set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'couple-photos';
