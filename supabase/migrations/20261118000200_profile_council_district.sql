-- Use the selected council district, not an ambiguous ZIP code, to identify
-- a resident's representative district during signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_district_number text;
  selected_district_id uuid;
begin
  selected_district_number :=
    new.raw_user_meta_data ->> 'council_district';

  if selected_district_number ~ '^(?:[1-9]|[1-4][0-9]|5[01])$' then
    select id
      into selected_district_id
      from public.districts
     where jurisdiction = 'New York City'
       and name = 'Council District ' || selected_district_number
     limit 1;
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    zip_code,
    district_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'resident',
    nullif(new.raw_user_meta_data ->> 'zip_code', ''),
    selected_district_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Repair district selection for existing accounts that signed up with the
-- district metadata before this trigger was installed. ZIP-only accounts are
-- intentionally left unchanged because ZIPs can span multiple districts.
update public.profiles profile
   set district_id = district.id
  from auth.users auth_user
  join public.districts district
    on district.jurisdiction = 'New York City'
   and district.name =
       'Council District ' || (auth_user.raw_user_meta_data ->> 'council_district')
 where profile.id = auth_user.id
   and profile.district_id is null
   and (auth_user.raw_user_meta_data ->> 'council_district')
       ~ '^(?:[1-9]|[1-4][0-9]|5[01])$';
