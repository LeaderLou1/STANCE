-- ============================================================
-- STANCE: Automatic Issue → Representative Assignment
-- ============================================================

create table if not exists public.representatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  district_id uuid references public.districts(id) on delete set null,
  council_member_id text,
  term_start date,
  term_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.representatives
  add column if not exists district_id uuid references public.districts(id) on delete set null,
  add column if not exists council_member_id text,
  add column if not exists term_start date,
  add column if not exists term_end date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.representatives enable row level security;
grant select on public.representatives to anon, authenticated;
drop policy if exists "Public can read representative directory" on public.representatives;
create policy "Public can read representative directory"
on public.representatives for select to anon, authenticated
using (true);

-- One representative per council district.
-- This prevents ambiguous issue assignment.
CREATE UNIQUE INDEX IF NOT EXISTS representatives_one_per_district
ON public.representatives (district_id)
WHERE district_id IS NOT NULL;


-- Automatically assign the representative whenever an issue
-- receives a district_id.
CREATE OR REPLACE FUNCTION public.assign_issue_representative()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.district_id IS NULL THEN
    NEW.representative_id := NULL;
    RETURN NEW;
  END IF;

  SELECT r.id
  INTO NEW.representative_id
  FROM public.representatives r
  WHERE r.district_id = NEW.district_id
  LIMIT 1;

  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS trg_assign_issue_representative
ON public.issues;


CREATE TRIGGER trg_assign_issue_representative
BEFORE INSERT OR UPDATE OF district_id
ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.assign_issue_representative();


-- Backfill any existing issues that already have a district
-- but don't yet have a representative.
UPDATE public.issues i
SET representative_id = r.id
FROM public.representatives r
WHERE i.district_id = r.district_id
  AND i.representative_id IS NULL;