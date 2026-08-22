-- Authorization, moderation, audit, and atomic interaction migration.
-- Run after 20260821_production_security.sql.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where profiles.id = auth.uid()
       and profiles.role in ('representative', 'admin')
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to anon, authenticated, service_role;

drop policy if exists "Users read issue media" on storage.objects;
create policy "Users read authorized issue media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'issue-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.issues
       where issues.resolution_proof_url = storage.objects.name
         and issues.moderation_status = 'Approved'
    )
    or public.is_staff()
  )
);

alter table public.issues
  add column if not exists moderation_status text,
  add column if not exists moderation_reason text,
  add column if not exists moderated_by uuid references auth.users(id),
  add column if not exists moderated_at timestamptz;

update public.issues
   set moderation_status = 'Approved'
 where moderation_status is null;

alter table public.issues
  alter column moderation_status set default 'Pending Review';

alter table public.issues
  add constraint issues_moderation_status_check
  check (moderation_status in ('Pending Review', 'Approved', 'Rejected', 'Needs Information'));

create index if not exists issues_public_feed_idx
  on public.issues (moderation_status, created_at desc);
create index if not exists issues_search_idx
  on public.issues using gin (lower(title) gin_trgm_ops);
create index if not exists issues_location_category_idx
  on public.issues (zip_code, category, created_at desc);

-- Replace unrestricted public visibility with moderated visibility.
drop policy if exists "Public can view issues" on public.issues;
create policy "Public can view approved issues"
on public.issues
for select
to anon, authenticated
using (
  moderation_status = 'Approved'
  or reporter_id = auth.uid()
  or public.is_staff()
);

-- Prevent users from changing ownership or moderation fields through updates.
drop policy if exists "Users can edit their own issues" on public.issues;
create policy "Users can edit their own issues"
on public.issues
for update
to authenticated
using (
  reporter_id = auth.uid()
  or public.is_staff()
)
with check (
  (reporter_id = auth.uid() and moderation_status = 'Pending Review')
  or public.is_staff()
);

-- Only staff can moderate; keep this separate from resident edits.
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
begin
  if not public.is_staff() then
    raise exception 'Staff authorization required';
  end if;
  if p_status not in ('Pending Review', 'Approved', 'Rejected', 'Needs Information') then
    raise exception 'Invalid moderation status';
  end if;
  update public.issues
     set moderation_status = p_status,
         moderation_reason = p_reason,
         moderated_by = auth.uid(),
         moderated_at = now()
   where id = p_issue_id;
end;
$$;

revoke all on function public.moderate_issue(uuid, text, text) from public, anon, authenticated;
grant execute on function public.moderate_issue(uuid, text, text) to authenticated;

-- Audit trail for staff and system actions.
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);
alter table public.audit_logs enable row level security;
drop policy if exists "Staff can read audit logs" on public.audit_logs;
create policy "Staff can read audit logs"
on public.audit_logs for select to authenticated
using (public.is_staff());

create or replace function public.write_issue_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    tg_op,
    'issue',
    coalesce(new.id, old.id),
    jsonb_build_object(
      'status', coalesce(new.status, old.status),
      'moderation_status', coalesce(new.moderation_status, old.moderation_status)
    )
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists issues_audit_trigger on public.issues;
create trigger issues_audit_trigger
after insert or update or delete on public.issues
for each row execute function public.write_issue_audit_log();

-- Comment ownership and moderation.
alter table public.comments
  add column if not exists reporter_id uuid references auth.users(id),
  add column if not exists moderation_status text not null default 'Approved',
  add column if not exists upvotes integer not null default 0;

update public.comments
   set reporter_id = coalesce(reporter_id, auth.uid())
 where reporter_id is null;

alter table public.comments
  add constraint comments_moderation_status_check
  check (moderation_status in ('Pending Review', 'Approved', 'Rejected'));
create index if not exists comments_issue_created_idx
  on public.comments (issue_id, created_at asc);

alter table public.comments enable row level security;
drop policy if exists "Public can read approved comments" on public.comments;
create policy "Public can read approved comments"
on public.comments for select to anon, authenticated
using (moderation_status = 'Approved' or reporter_id = auth.uid() or public.is_staff());
drop policy if exists "Authenticated users create comments" on public.comments;
create policy "Authenticated users create comments"
on public.comments for insert to authenticated
with check (reporter_id = auth.uid());
drop policy if exists "Users delete their own comments" on public.comments;
create policy "Users delete their own comments"
on public.comments for delete to authenticated
using (reporter_id = auth.uid() or public.is_staff());

-- Atomic votes prevent lost updates and repeated votes.
create table if not exists public.issue_votes (
  issue_id uuid not null references public.issues(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, voter_id)
);
alter table public.issue_votes enable row level security;
drop policy if exists "Users manage their issue votes" on public.issue_votes;
create policy "Users manage their issue votes"
on public.issue_votes for insert to authenticated
with check (voter_id = auth.uid());
drop policy if exists "Users read their issue votes" on public.issue_votes;
create policy "Users read their issue votes"
on public.issue_votes for select to authenticated
using (voter_id = auth.uid());

create or replace function public.vote_for_issue(p_issue_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  vote_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.issue_votes(issue_id, voter_id)
  values (p_issue_id, auth.uid())
  on conflict do nothing;
  select count(*) into vote_count from public.issue_votes where issue_id = p_issue_id;
  update public.issues set upvotes = vote_count where id = p_issue_id;
  return vote_count;
end;
$$;
revoke all on function public.vote_for_issue(uuid) from public, anon;
grant execute on function public.vote_for_issue(uuid) to authenticated;

create index if not exists storage_issue_media_path_idx
  on storage.objects (bucket_id, name);

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, voter_id)
);
alter table public.comment_votes enable row level security;
drop policy if exists "Users manage their comment votes" on public.comment_votes;
create policy "Users manage their comment votes"
on public.comment_votes for insert to authenticated
with check (voter_id = auth.uid());

create or replace function public.vote_for_comment(p_comment_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  vote_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.comment_votes(comment_id, voter_id)
  values (p_comment_id, auth.uid())
  on conflict do nothing;
  select count(*) into vote_count from public.comment_votes where comment_id = p_comment_id;
  update public.comments set upvotes = vote_count where id = p_comment_id;
  return vote_count;
end;
$$;
revoke all on function public.vote_for_comment(uuid) from public, anon;
grant execute on function public.vote_for_comment(uuid) to authenticated;
