# STANCE

STANCE lets a New York City resident report a local problem in seconds, sends it to the officials who can act on it, and shows the resident when someone takes ownership.

## MVP scope (pilot)

One district and one issue type.

1. A resident submits a report with a photo, a map pin, and an optional note. The category is suggested. No account is needed to submit.
2. The report is routed to the council member and community board for that address, using a hand-verified contact table (planned).
3. The resident sees a preview of exactly what will be sent and approves it. Nothing is sent without their approval (planned).
4. Each recipient gets an email with a secure, expiring link and three actions: "I've got it," "Assigned to...," and "Fixed." No login is required (planned).
5. The resident's status page updates from those responses and asks whether the issue was actually fixed (planned).

STANCE does not submit reports to 311.

## Current Status

**Stance v0.x - pilot development**

The production build passes locally. NYC district/representative data and Supabase authorization must be verified in the target project; a local build does not prove that the database migrations or RPCs work.

The MVP loop above is in progress. The existing district lookup, council member data, media upload, and progress tracker component are reused. The routing, delivery, and response tables, the send route, and the response-link pages are not built yet.

## Not in the MVP

Parked until the core loop is proven. These are not part of the pilot and may be hidden or unlinked:

- Representative CRM, SLA analytics, and predictive hotspots
- Representative and admin portals
- Public scorecards for officials
- The `/bid` workspace (an early prototype for Business Improvement Districts)
- Agency contacts beyond council members and community boards
- Group voting and duplicate merging
- Languages beyond English (text should be written so it can be translated later)

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase setup

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. The service-role key must never be exposed to browser code.

Run migrations in filename order. Existing projects should also apply `supabase/migrations/20261114000100_fix_production_contracts.sql` after the earlier migrations.

The MVP will add a migration for three tables: reports, deliveries, and responses, with row-level security so residents see only their own reports (planned).

After migrations succeed, seed NYC boundaries and representatives:

```bash
npm run seed:districts
npm run seed:representatives
```

Seeding requires official source data and an admin-managed Supabase project. Verify the resulting 51 district/representative records before enabling a pilot.

## Email setup (planned)

Sending email requires a provider, a verified sending domain, and server-side secrets. Proposed variable names, to be confirmed when the send route is built:

```
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=
RESPONSE_TOKEN_SECRET=
```

These stay server-side only. Response tokens are random, expiring, and stored hashed.

## Safeguards (planned)

- Rate limit and captcha on guest reports
- A daily cap on messages per recipient
- Expiring, single-purpose response tokens
- Resident approval before any message is sent, with a preview of what the recipient will see

## Security notes

- Do not commit `e2e/.auth/` or `supabase/.temp/`. Both should be listed in `.gitignore`.
- If a session token or key was ever committed, revoke it and rotate keys before sharing the repository.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Validation

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build -- --webpack
```

The build is not a substitute for testing the migrations and RLS policies in a staging Supabase project.

## Pilot success measures

- Seconds from opening the report form to submitting
- Share of sent reports that receive any official response
- Median hours to first response
- Share of residents who report again within 30 days