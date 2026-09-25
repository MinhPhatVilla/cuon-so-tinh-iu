-- Phase 3: a private, two-person space with single-use email-bound invitations.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.couple_spaces (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null default 'Cuốn Sổ tình iu',
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  unique (user_id)
);

create unique index if not exists one_owner_per_space
  on public.couple_members(space_id) where role = 'owner';

create table if not exists public.couple_invites (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  invited_email text not null,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists couple_invites_space_pending
  on public.couple_invites(space_id, expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.couple_spaces enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;

revoke all on public.couple_spaces, public.couple_members, public.couple_invites from anon, authenticated;
grant select on public.couple_spaces, public.couple_members to authenticated;

create or replace function private.is_couple_member(p_space_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.couple_members m
    where m.space_id = p_space_id and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_couple_member(uuid) from public;
grant execute on function private.is_couple_member(uuid) to authenticated;

create policy couple_spaces_read_members
  on public.couple_spaces for select to authenticated
  using (private.is_couple_member(id));

create policy couple_members_read_same_space
  on public.couple_members for select to authenticated
  using (private.is_couple_member(space_id));

create or replace function public.create_couple_space()
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_space_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users where id = v_user_id and email_confirmed_at is not null
  ) then
    raise exception 'confirmed email required' using errcode = '42501';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception 'already in a couple space' using errcode = '23505';
  end if;

  insert into public.couple_spaces(owner_id)
  values (v_user_id)
  returning id into v_space_id;

  insert into public.couple_members(space_id, user_id, role)
  values (v_space_id, v_user_id, 'owner');

  return v_space_id;
end;
$$;

revoke all on function public.create_couple_space() from public;
grant execute on function public.create_couple_space() to authenticated;

create or replace function public.create_couple_invite(p_space_id uuid, p_email text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_owner_email text;
  v_token text;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_email is null or length(v_email) > 254 or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  perform 1 from public.couple_spaces
    where id = p_space_id and owner_id = v_user_id for update;
  if not found then
    raise exception 'not the space owner' using errcode = '42501';
  end if;

  select count(*) into v_member_count from public.couple_members where space_id = p_space_id;
  if v_member_count >= 2 then
    raise exception 'space is full' using errcode = '23514';
  end if;

  select pg_catalog.lower(email) into v_owner_email from auth.users where id = v_user_id;
  if v_email = v_owner_email then
    raise exception 'cannot invite yourself' using errcode = '22023';
  end if;

  update public.couple_invites
    set revoked_at = now()
    where space_id = p_space_id and accepted_at is null and revoked_at is null;

  v_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')
    || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');

  insert into public.couple_invites(space_id, invited_email, token_hash, created_by, expires_at)
  values (
    p_space_id,
    v_email,
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_user_id,
    now() + interval '48 hours'
  );

  return v_token;
end;
$$;

revoke all on function public.create_couple_invite(uuid, text) from public;
grant execute on function public.create_couple_invite(uuid, text) to authenticated;

create or replace function public.accept_couple_invite(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_space_id uuid;
  v_invite public.couple_invites%rowtype;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid invitation' using errcode = '22023';
  end if;

  select space_id into v_space_id from public.couple_invites
    where token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_space_id is null then
    raise exception 'invitation unavailable' using errcode = '22023';
  end if;

  -- Lock the space before the invite, matching create_couple_invite's lock order.
  perform 1 from public.couple_spaces where id = v_space_id for update;
  select * into v_invite from public.couple_invites
    where token_hash = pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
    for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'invitation unavailable' using errcode = '22023';
  end if;

  select pg_catalog.lower(email), email_confirmed_at
    into v_user_email, v_email_confirmed_at
    from auth.users where id = v_user_id;
  if v_email_confirmed_at is null or v_user_email <> v_invite.invited_email then
    raise exception 'invitation belongs to another email' using errcode = '42501';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception 'already in a couple space' using errcode = '23505';
  end if;

  select count(*) into v_member_count from public.couple_members where space_id = v_invite.space_id;
  if v_member_count >= 2 then
    raise exception 'space is full' using errcode = '23514';
  end if;

  insert into public.couple_members(space_id, user_id, role)
  values (v_invite.space_id, v_user_id, 'partner');

  update public.couple_invites
    set accepted_by = v_user_id, accepted_at = now()
    where id = v_invite.id;

  return v_invite.space_id;
end;
$$;

revoke all on function public.accept_couple_invite(text) from public;
grant execute on function public.accept_couple_invite(text) to authenticated;

-- The bucket stays private. Upload/delete policies are added with the photo flow in phase 4.
insert into storage.buckets(id, name, public)
values ('couple-photos', 'couple-photos', false)
on conflict (id) do update set public = false;

create or replace function private.can_read_couple_photo(p_object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.couple_members m
    where m.user_id = (select auth.uid())
      and m.space_id::text = pg_catalog.split_part(p_object_name, '/', 1)
  );
$$;

revoke all on function private.can_read_couple_photo(text) from public;
grant execute on function private.can_read_couple_photo(text) to authenticated;

create policy couple_photos_read_members
  on storage.objects for select to authenticated
  using (bucket_id = 'couple-photos' and private.can_read_couple_photo(name));
