-- The feed selects public columns explicitly. The owner/admin RPC supplies private fields.
revoke select on public.reports from public, anon, authenticated;
revoke select (contact_preference, distinguishing_characteristics) on public.reports
  from public, anon, authenticated;
grant select (
  id, kind, item_name, category_id, description, date, time, location_id,
  building, floor_room, image_path, reporter_id, reporter_name, created_at,
  updated_at, status, current_holder, moderation_status, moderated_by,
  moderated_at, moderation_reason
) on public.reports to authenticated;
