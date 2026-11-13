-- Preserve existing rows and restrict access to private details at the database boundary.
create function public.get_lost_report_details(p_id uuid)
returns table(contact_preference text, distinguishing_characteristics text)
language sql stable security definer set search_path = '' as $$
  select r.contact_preference, r.distinguishing_characteristics
  from public.reports r
  where r.id = p_id and r.kind = 'lost'
    and auth.uid() is not null
    and (r.reporter_id = auth.uid() or (select private.is_admin()));
$$;

revoke execute on function public.get_lost_report_details(uuid) from public, anon;
grant execute on function public.get_lost_report_details(uuid) to authenticated;
