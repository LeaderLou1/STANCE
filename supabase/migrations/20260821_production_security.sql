-- Run this migration in Supabase SQL Editor.
-- It is written to be safe to run once after the existing reporter_id setup.

create extension if not exists pg_trgm;

-- Auth profile table required by ownership and staff policies.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'resident',
  zip_code text,
  district_id uuid,
  created_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('resident', 'representative', 'admin'))
);

alter table public.profiles
  add column if not exists full_name text not null default '',
  add column if not exists role text not null default 'resident',
  add column if not exists zip_code text,
  add column if not exists district_id uuid,
  add column if not exists created_at timestamptz not null default now();

alter table public.issues enable row level security;

-- Public issue discovery; mutation policies below still require authentication.
drop policy if exists "Public can view issues" on public.issues;
create policy "Public can view issues"
on public.issues
for select
to anon, authenticated
using (true);

drop policy if exists "Users can submit their own issues" on public.issues;
create policy "Users can submit their own issues"
on public.issues
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Users can edit their own issues" on public.issues;
create policy "Users can edit their own issues"
on public.issues
for update
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('representative', 'admin')
  )
)
with check (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('representative', 'admin')
  )
);

drop policy if exists "Users can delete their own issues" on public.issues;
create policy "Users can delete their own issues"
on public.issues
for delete
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Private media storage. The app must use signed URLs for reads.
insert into storage.buckets (id, name, public)
values ('issue-media', 'issue-media', false)
on conflict (id) do update set public = false;

drop policy if exists "Users upload their own issue media" on storage.objects;
create policy "Users upload their own issue media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read issue media" on storage.objects;
create policy "Users read issue media"
on storage.objects
for select
to authenticated
using (bucket_id = 'issue-media');

drop policy if exists "Users delete their own issue media" on storage.objects;
create policy "Users delete their own issue media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Store the object path, not an expiring URL.
alter table public.issues
add column if not exists resolution_proof_url text;

-- Persistent server-side rate-limit state.
create table if not exists public.report_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);
alter table public.report_rate_limits enable row level security;

revoke all on public.report_rate_limits from anon, authenticated;

create or replace function public.consume_report_rate_limit(
  p_bucket_key text,
  p_limit integer default 10,
  p_window interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_start timestamptz;
begin
  select request_count, window_started_at
    into current_count, current_start
    from public.report_rate_limits
   where bucket_key = p_bucket_key
   for update;

  if not found then
    insert into public.report_rate_limits (bucket_key, request_count)
    values (p_bucket_key, 1);
    return true;
  end if;

  if now() - current_start >= p_window then
    update public.report_rate_limits
       set window_started_at = now(), request_count = 1
     where bucket_key = p_bucket_key;
    return true;
  end if;

  if current_count >= p_limit then
    return false;
  end if;

  update public.report_rate_limits
     set request_count = request_count + 1
   where bucket_key = p_bucket_key;
  return true;
end;
$$;

revoke all on function public.consume_report_rate_limit(text, integer, interval)
from public, anon, authenticated;
grant execute on function public.consume_report_rate_limit(text, integer, interval)
to service_role;

-- Similarity lookup used by the server report endpoint.
create or replace function public.find_similar_issues(
  p_title text,
  p_zip_code text,
  p_category text
)
returns table (id uuid, title text, similarity_score real)
language sql
stable
security invoker
set search_path = public
as $$
  select i.id, i.title, similarity(lower(i.title), lower(p_title))
    from public.issues i
   where i.zip_code = p_zip_code
     and i.category = p_category
     and i.created_at > now() - interval '30 days'
     and similarity(lower(i.title), lower(p_title)) >= 0.65
   order by similarity(lower(i.title), lower(p_title)) desc
   limit 5;
$$;

grant execute on function public.find_similar_issues(text, text, text)
to authenticated;
