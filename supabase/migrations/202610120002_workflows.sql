-- Serialize report/claim mutations for this campus-scale v1. Row locks and unique
-- indexes also protect the invariants. The shared transaction lock avoids lock-order
-- deadlocks across competing claims involving different pairs of reports.
create function private.lock_workflow() returns void
language sql volatile set search_path = '' as $$ select pg_catalog.pg_advisory_xact_lock(8492026); $$;

create function private.validate_keys(p_data jsonb, p_allowed text[]) returns void
language plpgsql set search_path = '' as $$
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from jsonb_object_keys(p_data) k where not (k = any(p_allowed))) then
    raise exception 'PROTECTED_FIELD';
  end if;
end;
$$;

create function private.assert_editable(p_report public.reports) returns void
language plpgsql set search_path = '' as $$
begin
  if p_report.status in ('RETURNED','CLOSED') or exists (
    select 1 from public.claims where (found_item_id = p_report.id or lost_item_id = p_report.id)
      and status in ('UNDER_REVIEW','APPROVED','COMPLETED')
  ) then raise exception 'REPORT_LOCKED'; end if;
end;
$$;

create function private.validate_image(p_path text, p_report_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if p_path is null then return; end if;
  if p_path !~ ('^' || auth.uid()::text || '/' || p_report_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    or not exists(select 1 from storage.objects where bucket_id = 'item-images' and name = p_path) then
    raise exception 'INVALID_IMAGE';
  end if;
end;
$$;

create function private.sync_report_statuses() returns void
language sql volatile set search_path = '' as $$
  update public.reports r set status = case
    when exists(select 1 from public.claims c where (c.found_item_id = r.id or c.lost_item_id = r.id)
      and c.status in ('PENDING','UNDER_REVIEW','APPROVED')) then 'CLAIM_IN_PROGRESS'
    when r.kind = 'lost' then 'LOST' else 'AVAILABLE' end,
    updated_at = clock_timestamp()
  where r.status not in ('RETURNED','CLOSED') and r.status is distinct from (case
    when exists(select 1 from public.claims c where (c.found_item_id = r.id or c.lost_item_id = r.id)
      and c.status in ('PENDING','UNDER_REVIEW','APPROVED')) then 'CLAIM_IN_PROGRESS'
    when r.kind = 'lost' then 'LOST' else 'AVAILABLE' end);
$$;

create function public.create_report(p_id uuid, p_data jsonb, p_private_info text default null)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_report public.reports;
begin
  v_user := private.require_user();
  perform private.lock_workflow();
  perform private.validate_keys(p_data, array['kind','item_name','category_id','description','date','time','location_id','building','floor_room','image_path','distinguishing_characteristics','contact_preference','current_holder']);
  perform private.validate_image(p_data->>'image_path', p_id);
  insert into public.reports(id, kind, item_name, category_id, description, date, time, location_id, building, floor_room,
    image_path, reporter_id, reporter_name, status, distinguishing_characteristics, contact_preference, current_holder)
  values (p_id, p_data->>'kind', btrim(p_data->>'item_name'), p_data->>'category_id', btrim(p_data->>'description'),
    (p_data->>'date')::date, nullif(p_data->>'time','')::time, p_data->>'location_id', coalesce(p_data->>'building',''),
    coalesce(p_data->>'floor_room',''), p_data->>'image_path', v_user,
    (select full_name from public.profiles where id = v_user),
    case when p_data->>'kind' = 'lost' then 'LOST' else 'AVAILABLE' end,
    coalesce(btrim(p_data->>'distinguishing_characteristics'),''), coalesce(btrim(p_data->>'contact_preference'),''),
    p_data->>'current_holder') returning * into v_report;
  if v_report.kind = 'found' then
    insert into public.report_private(report_id, private_verification_info) values(p_id, btrim(p_private_info));
  end if;
  return v_report;
end;
$$;

create function public.edit_report(p_id uuid, p_data jsonb, p_expected_updated_at timestamptz, p_private_info text default null)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare v_report public.reports;
begin
  perform private.require_user();
  perform private.lock_workflow();
  select * into v_report from public.reports where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_report.reporter_id <> auth.uid() and not private.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  perform private.assert_editable(v_report);
  if p_expected_updated_at is null or v_report.updated_at <> p_expected_updated_at then raise exception 'STALE_RECORD'; end if;
  perform private.validate_keys(p_data, array['item_name','category_id','description','date','time','location_id','building','floor_room','image_path','distinguishing_characteristics','contact_preference','current_holder']);
  if p_data ? 'image_path' and (p_data->>'image_path') is distinct from v_report.image_path then
    perform private.validate_image(p_data->>'image_path', p_id);
  end if;
  update public.reports set
    item_name = case when p_data ? 'item_name' then btrim(p_data->>'item_name') else item_name end,
    category_id = case when p_data ? 'category_id' then p_data->>'category_id' else category_id end,
    description = case when p_data ? 'description' then btrim(p_data->>'description') else description end,
    date = case when p_data ? 'date' then (p_data->>'date')::date else date end,
    time = case when p_data ? 'time' then nullif(p_data->>'time','')::time else time end,
    location_id = case when p_data ? 'location_id' then p_data->>'location_id' else location_id end,
    building = case when p_data ? 'building' then p_data->>'building' else building end,
    floor_room = case when p_data ? 'floor_room' then p_data->>'floor_room' else floor_room end,
    image_path = case when p_data ? 'image_path' then p_data->>'image_path' else image_path end,
    distinguishing_characteristics = case when p_data ? 'distinguishing_characteristics' then btrim(p_data->>'distinguishing_characteristics') else distinguishing_characteristics end,
    contact_preference = case when p_data ? 'contact_preference' then btrim(p_data->>'contact_preference') else contact_preference end,
    current_holder = case when p_data ? 'current_holder' then p_data->>'current_holder' else current_holder end,
    updated_at = clock_timestamp()
    where id = p_id returning * into v_report;
  if v_report.kind = 'found' and p_private_info is not null then
    update public.report_private set private_verification_info = btrim(p_private_info) where report_id = p_id;
  end if;
  return v_report;
end;
$$;

create function public.moderate_report(p_id uuid, p_action text, p_reason text, p_expected_updated_at timestamptz)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare v_report public.reports;
begin
  perform private.require_admin(); perform private.lock_workflow();
  select * into v_report from public.reports where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_report.updated_at <> p_expected_updated_at then raise exception 'STALE_RECORD'; end if;
  if p_action = 'hide' then
    if coalesce(length(btrim(p_reason)),0) = 0 then raise exception 'REASON_REQUIRED'; end if;
    update public.reports set moderation_status = 'HIDDEN', moderation_reason = btrim(p_reason),
      moderated_by = auth.uid(), moderated_at = now(), updated_at = clock_timestamp() where id = p_id;
  elsif p_action = 'restore' then
    update public.reports set moderation_status = 'VISIBLE', moderated_by = auth.uid(),
      moderated_at = now(), updated_at = clock_timestamp() where id = p_id;
  elsif p_action = 'close' then
    if v_report.status = 'RETURNED' or exists(select 1 from public.claims where (found_item_id = p_id or lost_item_id = p_id) and status = 'APPROVED') then
      raise exception 'REPORT_LOCKED';
    end if;
    update public.reports set status = 'CLOSED', updated_at = clock_timestamp() where id = p_id;
  elsif p_action = 'reopen' then
    if v_report.status <> 'CLOSED' or exists(select 1 from public.claims where (found_item_id = p_id or lost_item_id = p_id) and status = 'COMPLETED') then
      raise exception 'REPORT_LOCKED';
    end if;
    update public.reports set status = case when kind = 'lost' then 'LOST' else 'AVAILABLE' end, updated_at = clock_timestamp() where id = p_id;
    perform private.sync_report_statuses();
  else raise exception 'INVALID_ACTION'; end if;
  select * into v_report from public.reports where id = p_id;
  return v_report;
end;
$$;

create function public.delete_report(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_path text;
begin
  perform private.require_admin(); perform private.lock_workflow();
  select image_path into v_path from public.reports where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  delete from public.reports where id = p_id; -- RESTRICT preserves linked claims.
  return v_path;
end;
$$;

create function public.update_profile_name(p_name text) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles;
begin
  perform private.require_user();
  update public.profiles set full_name = btrim(p_name) where id = auth.uid() returning * into v_profile;
  return v_profile;
end;
$$;
create function public.set_user_role(p_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin(); perform private.lock_workflow();
  if p_role not in ('member','admin') or p_role is null then raise exception 'INVALID_ROLE'; end if;
  if p_role = 'member' and exists(select 1 from public.profiles where id = p_id and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then raise exception 'LAST_ADMIN'; end if;
  update public.profiles set role = p_role where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end;
$$;

create function public.submit_claim(p_data jsonb) returns public.claims
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_found public.reports; v_lost public.reports; v_claim public.claims;
begin
  v_user := private.require_user(); perform private.lock_workflow();
  perform private.validate_keys(p_data, array['found_item_id','lost_item_id','explanation','distinguishing_characteristics','proof_of_ownership','contact_info']);
  select * into v_found from public.reports where id = (p_data->>'found_item_id')::uuid for update;
  if not found or v_found.kind <> 'found' or v_found.moderation_status <> 'VISIBLE' or v_found.status in ('RETURNED','CLOSED') then
    raise exception 'REPORT_UNAVAILABLE';
  end if;
  if nullif(p_data->>'lost_item_id','') is not null then
    select * into v_lost from public.reports where id = (p_data->>'lost_item_id')::uuid for update;
    if not found or v_lost.kind <> 'lost' or v_lost.reporter_id <> v_user or v_lost.moderation_status <> 'VISIBLE' or v_lost.status in ('RETURNED','CLOSED') then
      raise exception 'INVALID_LOST_REPORT';
    end if;
  end if;
  insert into public.claims(found_item_id,lost_item_id,claimant_id,claimant_name,explanation,distinguishing_characteristics,proof_of_ownership,contact_info)
  values(v_found.id,v_lost.id,v_user,(select full_name from public.profiles where id = v_user),
    btrim(p_data->>'explanation'),btrim(p_data->>'distinguishing_characteristics'),p_data->>'proof_of_ownership',btrim(p_data->>'contact_info'))
    returning * into v_claim;
  perform private.sync_report_statuses();
  return v_claim;
end;
$$;

create function public.transition_claim(p_id uuid, p_action text, p_expected_updated_at timestamptz, p_note text default null)
returns public.claims language plpgsql security definer set search_path = '' as $$
declare v_claim public.claims; v_next text; v_found public.reports; v_lost public.reports;
begin
  perform private.require_admin(); perform private.lock_workflow();
  select * into v_claim from public.claims where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_claim.updated_at <> p_expected_updated_at then raise exception 'STALE_RECORD'; end if;
  if p_action = 'review' and v_claim.status = 'PENDING' then v_next := 'UNDER_REVIEW';
  elsif p_action = 'approve' and v_claim.status = 'UNDER_REVIEW' then v_next := 'APPROVED';
  elsif p_action = 'complete' and v_claim.status = 'APPROVED' then v_next := 'COMPLETED';
  elsif p_action = 'reject' and v_claim.status in ('PENDING','UNDER_REVIEW','APPROVED') then v_next := 'REJECTED';
  elsif p_action = 'reopen' and v_claim.status = 'REJECTED' then v_next := 'UNDER_REVIEW';
  else raise exception 'INVALID_TRANSITION'; end if;
  select * into v_found from public.reports where id = v_claim.found_item_id for update;
  if v_claim.lost_item_id is not null then
    select * into v_lost from public.reports where id = v_claim.lost_item_id for update;
  end if;
  if v_next <> 'REJECTED' and (v_found.status in ('RETURNED','CLOSED') or v_lost.status in ('RETURNED','CLOSED')) then
    raise exception 'REPORT_UNAVAILABLE';
  end if;
  if p_action = 'reopen' and (v_found.moderation_status <> 'VISIBLE' or v_lost.moderation_status = 'HIDDEN') then
    raise exception 'REPORT_UNAVAILABLE';
  end if;
  update public.claims set status = v_next, reviewed_by = auth.uid(),
    staff_note = coalesce(p_note,staff_note), updated_at = clock_timestamp() where id = p_id returning * into v_claim;
  if v_next = 'COMPLETED' then
    -- Include conflicts on either item, even when linked to a different found item.
    update public.claims set status = 'REJECTED', reviewed_by = auth.uid(), updated_at = clock_timestamp(),
      staff_note = 'Vật phẩm đã được bàn giao theo một yêu cầu khác.'
      where id <> p_id and status in ('PENDING','UNDER_REVIEW','APPROVED')
      and (found_item_id = v_claim.found_item_id or (v_claim.lost_item_id is not null and lost_item_id = v_claim.lost_item_id));
    update public.reports set status = 'RETURNED', updated_at = clock_timestamp()
      where id in (v_claim.found_item_id,v_claim.lost_item_id);
  end if;
  perform private.sync_report_statuses();
  return v_claim;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
revoke execute on function public.create_report(uuid,jsonb,text), public.edit_report(uuid,jsonb,timestamptz,text),
  public.moderate_report(uuid,text,text,timestamptz), public.delete_report(uuid), public.update_profile_name(text),
  public.set_user_role(uuid,text), public.submit_claim(jsonb), public.transition_claim(uuid,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.create_report(uuid,jsonb,text), public.edit_report(uuid,jsonb,timestamptz,text),
  public.moderate_report(uuid,text,text,timestamptz), public.delete_report(uuid), public.update_profile_name(text),
  public.set_user_role(uuid,text), public.submit_claim(jsonb), public.transition_claim(uuid,text,timestamptz,text)
  to authenticated;
