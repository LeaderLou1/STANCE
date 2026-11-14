# NYC District Data Setup

Run all migrations in filename order, including `20261114000100_fix_production_contracts.sql`. It creates the `upsert_district_boundary` RPC expected by the current seeder, the `representatives` table, spatial district resolver, and media cleanup view.

Then run:

```bash
npm run seed:districts
npm run seed:representatives
```

The seeders use NYC Open Data and require `.env.local` with the server-only `SUPABASE_SERVICE_ROLE_KEY`. They stop if they cannot account for all 51 districts/current representatives. Verify imported data against the published dataset and current term before treating it as authoritative.

Do not invent ZIP mappings for production. Import official NYC boundary or agency assignment data and document the source date.

## Create a district

```sql
insert into public.districts (name, jurisdiction)
values ('Council District 1', 'New York City')
returning id;
```

## Map ZIP fallback data

Use ZIP mappings only as a temporary fallback when a report has no usable coordinates:

```sql
insert into public.district_zip_codes (district_id, zip_code)
values ('DISTRICT_UUID', '10001');
```

A ZIP may overlap more than one district. When that happens, do not insert an arbitrary mapping. Use coordinate-based boundary resolution instead.

## Verify a representative

First grant the account a representative role through an admin-controlled operation. Then assign it to a district:

```sql
select public.assign_representative_to_district(
  'DISTRICT_UUID',
  'REPRESENTATIVE_PROFILE_UUID'
);
```

The function rejects non-admin callers and profiles that are not already representatives.

## Verify assignments

```sql
select
  d.name,
  d.jurisdiction,
  p.full_name as representative,
  p.role,
  count(i.id) as assigned_reports
from public.districts d
left join public.profiles p on p.id = d.representative_profile_id
left join public.issues i on i.district_id = d.id
group by d.id, p.id
order by d.name;
```
