-- Forward repair migration for the current API, district importers, and media cleanup.
-- Run after all existing migrations.

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- Official representatives are distinct from authenticated staff profiles.
create table if not exists public.representatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  district_id uuid references public.districts(id) on delete set null,
  council_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.representatives
  add column if not exists name text,
  add column if not exists district text,
  add column if not exists district_id uuid references public.districts(id) on delete set null,
  add column if not exists council_member_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists representatives_council_member_id_idx
  on public.representatives (council_member_id)
  where council_member_id is not null;
create unique index if not exists representatives_district_id_idx
  on public.representatives (district_id)
  where district_id is not null;

alter table public.representatives enable row level security;
grant select on public.representatives to anon, authenticated;
drop policy if exists "Public can read representative directory" on public.representatives;
create policy "Public can read representative directory"
on public.representatives for select to anon, authenticated
using (true);

-- Ensure PostgREST can resolve the existing issue-to-representative relation.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_representative'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues
      add constraint fk_representative
      foreign key (representative_id)
      references public.representatives(id)
      not valid;
  end if;
end;
$$;

alter table public.issues
  add column if not exists civic_context jsonb;

-- API contract: text similarity only; embeddings are deliberately not required.
create or replace function public.find_similar_issues_v2(
  p_title text,
  p_zip_code text,
  p_category text,
  p_limit integer default 3
)
returns table (id uuid, title text, similarity_score real)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, similarity(lower(i.title), lower(p_title))::real
    from public.issues i
   where i.category = p_category
     and (p_zip_code is null or i.zip_code = p_zip_code)
     and i.created_at > now() - interval '30 days'
     and i.moderation_status in ('Pending Review', 'Approved')
     and similarity(lower(i.title), lower(p_title)) >= 0.65
   order by similarity(lower(i.title), lower(p_title)) desc
   limit greatest(1, least(p_limit, 10));
$$;
revoke all on function public.find_similar_issues_v2(text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.find_similar_issues_v2(text, text, text, integer)
  to service_role;

-- Resolve a point only when exactly one district polygon covers it.
create or replace function public.resolve_district_for_point(
  p_lat double precision,
  p_lng double precision
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  matching_count integer;
  matching_id uuid;
begin
  select count(*), min(id::text)::uuid
    into matching_count, matching_id
    from public.districts
   where boundary is not null
     and st_covers(
       boundary,
       st_setsrid(st_makepoint(p_lng, p_lat), 4326)
     );
  if matching_count <> 1 then
    return null;
  end if;
  return matching_id;
end;
$$;
revoke all on function public.resolve_district_for_point(double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.resolve_district_for_point(double precision, double precision)
  to service_role;

-- ZIP fallback is intentionally unresolved when multiple districts map to a ZIP.
create or replace function public.resolve_district_for_zip(p_zip_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  match_count integer;
  match_id uuid;
begin
  select count(distinct district_id), min(district_id::text)::uuid
    into match_count, match_id
    from public.district_zip_codes
   where zip_code = p_zip_code;
  if match_count <> 1 then
    return null;
  end if;
  return match_id;
end;
$$;
revoke all on function public.resolve_district_for_zip(text)
  from public, anon, authenticated;
grant execute on function public.resolve_district_for_zip(text)
  to service_role;

-- Importer contract matches scripts/seed-districts.ts (GeoJSON object argument).
create or replace function public.upsert_district_boundary(
  p_name text,
  p_jurisdiction text,
  p_geojson jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
  parsed geometry;
begin
  parsed := st_setsrid(st_geomfromgeojson(p_geojson::text), 4326);
  if geometrytype(parsed) not in ('POLYGON', 'MULTIPOLYGON') then
    raise exception 'Expected Polygon or MultiPolygon geometry';
  end if;

  insert into public.districts (name, jurisdiction, boundary)
  values (p_name, p_jurisdiction, st_multi(parsed)::geometry(MultiPolygon, 4326))
  on conflict (name, jurisdiction)
  do update set boundary = excluded.boundary
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.upsert_district_boundary(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_district_boundary(text, text, jsonb)
  to service_role;

-- One indexed source of paths referenced by issues and comments.
create or replace view public.active_media_paths
with (security_invoker = true)
as
  select resolution_proof_url as storage_path
    from public.issues
   where resolution_proof_url is not null
  union
  select media_url as storage_path
    from public.comments
   where media_url is not null;
revoke all on public.active_media_paths from public, anon, authenticated;
grant select on public.active_media_paths to service_role;

-- Representatives may change only reports in their assigned district.
-- Residents may edit only their own reports while pending review.
drop policy if exists "Users can edit their own issues" on public.issues;
drop policy if exists "Owners admins or assigned representatives can update issues" on public.issues;
create policy "Owners admins or assigned representatives can update issues"
on public.issues for update to authenticated
using (
  (reporter_id = auth.uid() and moderation_status = 'Pending Review')
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
  )
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'representative'
       and p.district_id = issues.district_id
  )
)
with check (
  (reporter_id = auth.uid() and moderation_status = 'Pending Review')
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
  )
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'representative'
       and p.district_id = issues.district_id
  )
);

drop policy if exists "Users can delete their own issues" on public.issues;
drop policy if exists "Owners can delete pending issues and admins any issue" on public.issues;
create policy "Owners can delete pending issues and admins any issue"
on public.issues for delete to authenticated
using (
  (reporter_id = auth.uid() and moderation_status = 'Pending Review')
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role = 'admin'
  )
);

-- District-limited staff moderation; admins can moderate citywide.
create or replace function public.moderate_issue(
  p_issue_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_district uuid;
  issue_district uuid;
begin
  select role, district_id into actor_role, actor_district
    from public.profiles where id = auth.uid();
  if actor_role is null or actor_role not in ('representative', 'admin') then
    raise exception 'Staff authorization required';
  end if;
  if p_status not in ('Pending Review', 'Approved', 'Rejected', 'Needs Information') then
    raise exception 'Invalid moderation status';
  end if;
  select district_id into issue_district
    from public.issues where id = p_issue_id;
  if not found then raise exception 'Issue not found'; end if;
  if actor_role = 'representative' and actor_district is distinct from issue_district then
    raise exception 'Representative is not assigned to this district';
  end if;
  update public.issues
     set moderation_status = p_status,
         moderation_reason = left(p_reason, 2000),
         moderated_by = auth.uid(),
         moderated_at = now()
   where id = p_issue_id;
end;
$$;
revoke all on function public.moderate_issue(uuid, text, text)
  from public, anon;
grant execute on function public.moderate_issue(uuid, text, text)
  to authenticated;
