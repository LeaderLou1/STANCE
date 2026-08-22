-- Required before running scripts/seed-districts.ts.
create extension if not exists postgis;

alter table public.districts
  add column if not exists boundary geometry(MultiPolygon, 4326);

create unique index if not exists districts_name_jurisdiction_idx
  on public.districts (name, jurisdiction);
create index if not exists districts_boundary_gist_idx
  on public.districts using gist (boundary);

create or replace function public.insert_district_geojson(
  p_name text,
  p_jurisdiction text,
  p_geojson text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  district_id uuid;
begin
  if auth.uid() is not null then
    if not exists (
      select 1 from public.profiles
       where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Admin authorization required';
    end if;
  end if;

  insert into public.districts (name, jurisdiction, boundary)
  values (
    p_name,
    p_jurisdiction,
    st_multi(st_setsrid(st_geomfromgeojson(p_geojson), 4326))
  )
  on conflict (name, jurisdiction)
  do update set boundary = excluded.boundary
  returning id into district_id;

  return district_id;
end;
$$;

revoke all on function public.insert_district_geojson(text, text, text)
from public, anon, authenticated;
grant execute on function public.insert_district_geojson(text, text, text)
to service_role;
