-- District relationship model.
-- Populate districts and district_zip_codes from the agency's official boundary data.

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  jurisdiction text not null,
  representative_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.district_zip_codes (
  district_id uuid not null references public.districts(id) on delete cascade,
  zip_code text not null check (zip_code ~ '^[0-9]{5}$'),
  primary key (district_id, zip_code)
);

alter table public.profiles
  add column if not exists district_id uuid references public.districts(id);

alter table public.issues
  add column if not exists district_id uuid references public.districts(id);

create index if not exists district_zip_codes_zip_idx
  on public.district_zip_codes (zip_code);
create index if not exists issues_district_created_idx
  on public.issues (district_id, created_at desc);
create unique index if not exists districts_one_representative_idx
  on public.districts (representative_profile_id)
  where representative_profile_id is not null;

-- Keep district assignment explicit and prevent assigning a non-staff profile.
create or replace function public.assign_representative_to_district(
  p_district_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Admin authorization required';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = p_profile_id and role = 'representative'
  ) then
    raise exception 'Profile must have representative role';
  end if;
  update public.districts
     set representative_profile_id = p_profile_id
   where id = p_district_id;
  update public.profiles
     set district_id = p_district_id
   where id = p_profile_id;
end;
$$;

revoke all on function public.assign_representative_to_district(uuid, uuid)
from public, anon;
grant execute on function public.assign_representative_to_district(uuid, uuid)
to authenticated;

create or replace function public.resolve_district_for_zip(p_zip_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select district_id
    from public.district_zip_codes
   where zip_code = p_zip_code
   limit 1;
$$;

revoke all on function public.resolve_district_for_zip(text) from public, anon, authenticated;
grant execute on function public.resolve_district_for_zip(text) to service_role;

-- Backfill existing reports only where an official ZIP mapping exists.
update public.issues i
   set district_id = public.resolve_district_for_zip(i.zip_code)
 where i.district_id is null
   and exists (
     select 1 from public.district_zip_codes z
      where z.zip_code = i.zip_code
   );

-- Representative staff access is limited to their assigned district.
drop policy if exists "Public can view approved issues" on public.issues;
create policy "Public can view approved issues"
on public.issues for select to anon, authenticated
using (
  moderation_status = 'Approved'
  and (
    auth.uid() is null
    or exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'resident'
    )
  )
  or reporter_id = auth.uid()
  or exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Representatives read assigned district issues" on public.issues;
create policy "Representatives read assigned district issues"
on public.issues for select to authenticated
using (
  public.is_staff()
  and exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'representative'
       and p.district_id = issues.district_id
  )
);

-- Admins may manage all issues through the existing staff policies.
