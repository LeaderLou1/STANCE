# NYC District Data Setup

Run `supabase/migrations/20260825_district_geometry.sql` after the district relationship migration. It enables PostGIS and creates the idempotent `insert_district_geojson` function used by the seeder.

Then run:

```bash
npm run seed:districts
```

The seeder uses the official NYC Open Data GeoJSON endpoint and the `coundist` field. It imports 51 City Council district geometries and can be run again safely. The command loads `.env.local` and requires `SUPABASE_SERVICE_ROLE_KEY`.

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
