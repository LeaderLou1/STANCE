## STANCE

STANCE turns local civic reports into a shared, accountable public record for constituents, representatives, and administrators.

### Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it with a `NEXT_PUBLIC_` prefix.

### Supabase setup

Run these migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/20260821_production_security.sql`
2. `supabase/migrations/20260822_authorization_moderation.sql`
3. `supabase/migrations/20260823_auth_profiles.sql`
4. `supabase/migrations/20260824_district_relationships.sql`
5. `supabase/migrations/20260825_district_geometry.sql`

Enable Email Auth, configure the site URL and redirect URLs, create the `profiles` table with `resident`, `representative`, and `admin` roles, and configure the private `issue-media` bucket.

Populate `districts` and `district_zip_codes` with official agency boundary data. Assign representatives by setting `profiles.district_id`; residents never self-select a representative role or district.

See [docs/NYC_DISTRICTS.md](docs/NYC_DISTRICTS.md) for the controlled assignment and verification flow.

After the migrations, seed official NYC Council boundaries with `npm run seed:districts`. The command requires `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### Checks

```bash
npx tsc --noEmit
npm run lint
npm run build -- --webpack
node --test tests/*.test.mjs
```

### Product boundaries

Broadcast delivery is disabled until a real notification provider is configured. MIME and size checks are not malware scanning; production deployments must connect an approved scanning service.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/RUNBOOK.md](docs/RUNBOOK.md), and [docs/PILOT_PLAN.md](docs/PILOT_PLAN.md) before a public launch.
