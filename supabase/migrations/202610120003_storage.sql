insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('item-images','item-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create function private.can_upload_image(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_report public.reports; v_id uuid;
begin
  perform private.require_user();
  if p_name !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$') then return false; end if;
  v_id := split_part(p_name,'/',2)::uuid;
  select * into v_report from public.reports where id = v_id;
  if not found then return true; end if;
  if v_report.reporter_id <> auth.uid() and not private.is_admin() then return false; end if;
  perform private.assert_editable(v_report);
  return true;
exception when others then return false;
end;
$$;
create function private.can_read_image(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.reports r where r.image_path = p_name and (
      r.moderation_status = 'VISIBLE' or r.reporter_id = auth.uid() or private.is_admin()
      or exists(select 1 from public.claims c where c.claimant_id = auth.uid() and (c.found_item_id = r.id or c.lost_item_id = r.id))))
    or (split_part(p_name,'/',1) = auth.uid()::text and not exists(select 1 from public.reports where image_path = p_name))
    or private.is_admin());
$$;
create function private.can_delete_image(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.is_admin() or split_part(p_name,'/',1) = auth.uid()::text)
    and not exists(select 1 from public.reports where image_path = p_name);
$$;
revoke execute on function private.can_upload_image(text), private.can_read_image(text), private.can_delete_image(text) from public, anon;
grant execute on function private.can_upload_image(text), private.can_read_image(text), private.can_delete_image(text) to authenticated;
create policy item_images_read on storage.objects for select to authenticated
  using (bucket_id = 'item-images' and private.can_read_image(name));
create policy item_images_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and private.can_upload_image(name));
create policy item_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and private.can_delete_image(name));
-- No UPDATE policy: images use immutable unique paths; replacement changes reports.image_path.
