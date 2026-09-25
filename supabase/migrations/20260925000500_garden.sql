-- Phase 8: gifts and future letters. Apply after 20260925000400_memory_magic.sql.
create table public.gifts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('flower', 'card', 'star')),
  message text not null check (char_length(pg_catalog.btrim(message)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index gifts_space_newest on public.gifts(space_id, created_at desc);
alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;
grant select on public.gifts to authenticated;
create policy gifts_read_members on public.gifts for select to authenticated
  using (private.is_couple_member(space_id));

create or replace function public.send_gift(p_kind text, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_space uuid;
  v_recipient uuid;
  v_id uuid;
begin
  if v_sender is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('flower', 'card', 'star')
    or p_message is null or char_length(pg_catalog.btrim(p_message)) not between 1 and 500 then
    raise exception 'invalid gift' using errcode = '22023';
  end if;
  select space_id into v_space from public.couple_members where user_id = v_sender;
  if v_space is null then raise exception 'not a couple member' using errcode = '42501'; end if;
  select user_id into v_recipient from public.couple_members
    where space_id = v_space and user_id <> v_sender;
  if v_recipient is null then raise exception 'partner not joined' using errcode = '22023'; end if;
  insert into public.gifts(space_id, sender_id, recipient_id, kind, message)
    values (v_space, v_sender, v_recipient, p_kind, pg_catalog.btrim(p_message)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_gift(text,text) from public;
grant execute on function public.send_gift(text,text) to authenticated;

-- Envelopes contain no letter body or photo path. Realtime only publishes envelopes.
create table public.future_letters (
  id uuid primary key,
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  opens_on date not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index future_letters_space_date on public.future_letters(space_id, opens_on, created_at desc);
create table public.future_letter_contents (
  letter_id uuid primary key references public.future_letters(id) on delete cascade,
  title text not null check (char_length(pg_catalog.btrim(title)) between 1 and 100),
  body text not null check (char_length(pg_catalog.btrim(body)) between 1 and 5000),
  photo_path text unique
);
alter table public.future_letters enable row level security;
alter table public.future_letter_contents enable row level security;
revoke all on public.future_letters, public.future_letter_contents from anon, authenticated;
grant select on public.future_letters to authenticated;
create policy future_letters_read_members on public.future_letters for select to authenticated
  using (private.is_couple_member(space_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('future-letter-photos', 'future-letter-photos', false, 2097152, array['image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/webp'];

create or replace function private.can_read_future_letter_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.future_letter_contents c
    join public.future_letters l on l.id = c.letter_id
    where c.photo_path = p_name and private.is_couple_member(l.space_id)
      and l.opens_on <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
  );
$$;
revoke all on function private.can_read_future_letter_photo(text) from public;
grant execute on function private.can_read_future_letter_photo(text) to authenticated;

create policy future_letter_photos_insert_sender on storage.objects for insert to authenticated
  with check (bucket_id = 'future-letter-photos'
    and pg_catalog.split_part(name, '/', 2) = (select auth.uid())::text
    and exists (select 1 from public.couple_members m where m.user_id = (select auth.uid())
      and m.space_id::text = pg_catalog.split_part(name, '/', 1))
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$');
create policy future_letter_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'future-letter-photos'
    and (owner_id = (select auth.uid())::text or private.can_read_future_letter_photo(name)));
create policy future_letter_photos_delete_sender on storage.objects for delete to authenticated
  using (bucket_id = 'future-letter-photos' and owner_id = (select auth.uid())::text);

create or replace function public.create_future_letter(
  p_letter_id uuid, p_title text, p_body text, p_opens_on date, p_has_photo boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_space uuid;
  v_recipient uuid;
  v_path text;
begin
  if v_sender is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_letter_id is null or p_title is null or char_length(pg_catalog.btrim(p_title)) not between 1 and 100
    or p_body is null or char_length(pg_catalog.btrim(p_body)) not between 1 and 5000
    or p_opens_on is null or p_opens_on <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
    or p_opens_on > ((now() at time zone 'Asia/Ho_Chi_Minh')::date + interval '10 years')::date
    or p_has_photo is null then
    raise exception 'invalid future letter' using errcode = '22023';
  end if;
  select space_id into v_space from public.couple_members where user_id = v_sender;
  if v_space is null then raise exception 'not a couple member' using errcode = '42501'; end if;
  select user_id into v_recipient from public.couple_members
    where space_id = v_space and user_id <> v_sender;
  if v_recipient is null then raise exception 'partner not joined' using errcode = '22023'; end if;
  if p_has_photo then
    v_path := v_space::text || '/' || v_sender::text || '/' || p_letter_id::text || '.webp';
    if not exists (select 1 from storage.objects where bucket_id = 'future-letter-photos'
      and name = v_path and owner_id = v_sender::text) then
      raise exception 'letter photo missing' using errcode = '22023';
    end if;
  end if;
  insert into public.future_letters(id, space_id, sender_id, recipient_id, opens_on)
    values (p_letter_id, v_space, v_sender, v_recipient, p_opens_on);
  insert into public.future_letter_contents(letter_id, title, body, photo_path)
    values (p_letter_id, pg_catalog.btrim(p_title), pg_catalog.btrim(p_body), v_path);
  return p_letter_id;
end;
$$;
revoke all on function public.create_future_letter(uuid,text,text,date,boolean) from public;
grant execute on function public.create_future_letter(uuid,text,text,date,boolean) to authenticated;

create or replace function public.read_future_letter(p_letter_id uuid)
returns table(title text, body text, photo_path text) language plpgsql security definer set search_path = '' as $$
begin
  return query select c.title, c.body, c.photo_path from public.future_letter_contents c
    join public.future_letters l on l.id = c.letter_id
    where l.id = p_letter_id and private.is_couple_member(l.space_id)
      and l.opens_on <= (now() at time zone 'Asia/Ho_Chi_Minh')::date;
end;
$$;
revoke all on function public.read_future_letter(uuid) from public;
grant execute on function public.read_future_letter(uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gifts') then
      alter publication supabase_realtime add table public.gifts;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'future_letters') then
      alter publication supabase_realtime add table public.future_letters;
    end if;
  end if;
end $$;
