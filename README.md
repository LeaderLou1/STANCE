# STANCE

STANCE turns local civic reports into a shared, accountable public record for constituents, representatives, and administrators.

## Current Status

**Stance v0.x — pilot development**

The production build passes locally. NYC district/representative data and Supabase authorization must be verified in the target project; a local build does not prove that the database migrations or RPCs work.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase setup

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. The service-role key must never be exposed to browser code.

Run migrations in filename order. Existing projects should also apply `supabase/migrations/20261114000100_fix_production_contracts.sql` after the earlier migrations.

After migrations succeed, seed NYC boundaries and representatives:

```bash
npm run seed:districts
npm run seed:representatives
```

Seeding requires official source data and an admin-managed Supabase project. Verify the resulting 51 district/representative records before enabling a pilot.

## Validation

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build -- --webpack
```

The build is not a substitute for testing the migrations and RLS policies in a staging Supabase project.