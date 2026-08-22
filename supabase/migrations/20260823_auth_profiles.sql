-- Create a resident profile for every new Auth user.
-- Never accept a role from browser metadata; staff promotion is an explicit admin action.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, zip_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'resident',
    nullif(new.raw_user_meta_data ->> 'zip_code', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill accounts created before this trigger was installed.
insert into public.profiles (id, full_name, role, zip_code)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  'resident',
  nullif(raw_user_meta_data ->> 'zip_code', '')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "Users cannot self-assign roles" on public.profiles;
create policy "Users cannot self-assign roles"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = 'resident');

create or replace function public.grant_staff_role(
  p_user_id uuid,
  p_role text
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
  if p_role not in ('resident', 'representative', 'admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

revoke all on function public.grant_staff_role(uuid, text) from public, anon;
grant execute on function public.grant_staff_role(uuid, text) to authenticated;
