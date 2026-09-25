-- Phase 10: a removed photo must stop being readable immediately, even if
-- deleting its Storage object needs a later retry.
create or replace function private.can_read_couple_photo(p_object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.couple_members cm
      where cm.user_id = (select auth.uid())
        and cm.space_id::text = pg_catalog.split_part(p_object_name, '/', 1)
    )
    and (
      -- The author can read an upload in progress, a draft, or a pending cleanup object.
      pg_catalog.split_part(p_object_name, '/', 2) = (select auth.uid())::text
      or exists (
        select 1 from public.photos p
        join public.memories m on m.id = p.memory_id
        where (p.original_path = p_object_name or p.display_path = p_object_name)
          and p.space_id = m.space_id
          and m.status = 'published'
      )
    );
$$;

-- Storage removals are allowed only after a DB photo record has been removed
-- (or when an upload failed before attachment). This keeps live photos intact.
create or replace function private.can_remove_couple_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and pg_catalog.split_part(p_name, '/', 2) = (select auth.uid())::text
    and exists (
      select 1 from public.couple_members cm
      where cm.user_id = (select auth.uid())
        and cm.space_id::text = pg_catalog.split_part(p_name, '/', 1)
    )
    and not exists (
      select 1 from public.photos p
      where p.original_path = p_name or p.display_path = p_name
    );
$$;

create or replace function private.can_remove_future_letter_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.future_letter_contents c where c.photo_path = p_name
  );
$$;
revoke all on function private.can_remove_future_letter_photo(text) from public;
grant execute on function private.can_remove_future_letter_photo(text) to authenticated;

drop policy if exists future_letter_photos_delete_sender on storage.objects;
create policy future_letter_photos_delete_unattached on storage.objects for delete to authenticated
  using (bucket_id = 'future-letter-photos'
    and owner_id = (select auth.uid())::text
    and private.can_remove_future_letter_photo(name));
