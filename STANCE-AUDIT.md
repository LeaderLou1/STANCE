# STANCE Whole-App Audit

Date: 2026-11-18

## Executive summary

STANCE is a Next.js civic reporting application backed by Supabase. It provides public issue discovery, authenticated resident reporting, representative district workflows, admin analytics, media evidence, voting, discussion, and geographic district resolution.

The application has a strong server/API boundary, role-aware views, responsive Tailwind layouts, and production build success. The audit fixes improve ownership enforcement in the UI, private evidence rendering, failure visibility, session messaging, geolocation feedback, modal keyboard behavior, and destructive/reply confirmations.

## Product flows

- Residents can browse reports, search by keyword or district, vote, submit reports, edit or delete their own pending reports, upload evidence, and participate in discussions.
- Representatives can review campaign intelligence, moderate reports, update status, add official replies, and dispatch work orders where the data model supports it.
- Admins can review work orders, SLA and risk analytics, and purge records.
- Supabase Auth establishes residents and staff profiles; staff roles are separately granted.
- Address search, geolocation, NYC 311 enrichment, council member lookup, and PostGIS district resolution provide geographic context.

## Architecture

- Next.js App Router for pages and server/API routes.
- React and TypeScript for UI and client state.
- Tailwind CSS for responsive presentation.
- Supabase Auth, database, RLS, RPC functions, storage, and realtime subscriptions.
- NYC Open Data and geospatial proxy routes for external civic data.

## Findings fixed

| Priority | Area | Fix |
|---|---|---|
| High | Private evidence | Signed-storage URLs are allowed by Next Image configuration. |
| High | Resident ownership | Edit and delete controls now require the authenticated user's ID to match `reporter_id`. |
| High | Failure visibility | Loading, mutation, geolocation, and address-search failures now produce visible in-app messages. |
| Medium | Session messaging | A generic saved-session verification message replaces misleading session-expiration copy for unauthenticated users. |
| Medium | Geolocation | Unsupported and denied location access now provide an explanatory UI message. |
| Medium | Modal accessibility | The report dialog supports Escape, initial focus, and keyboard focus containment. |
| Medium | Destructive actions | Delete uses an inline confirmation; official replies use an inline textarea instead of browser prompts. |

## Code quality and operations

### Positive areas

- Server routes validate bearer sessions before mutations.
- Mutations use either user-bound RPC clients or explicitly authenticated admin clients.
- RLS and role-grant migrations provide defense beyond the UI.
- Build and lint validate the complete Next.js source surface.
- Mobile layouts were checked at a 390px viewport without horizontal overflow.
- Invalid credentials show an accessible inline error.

### Residual risks

- Live Supabase, NYC Open Data, staff-account, and representative-role behavior still require credentials and production data to verify end to end.
- External API availability is a runtime dependency for district and 311 enrichment.
- Media rendering should be monitored as signed URLs expire and are renewed.
- Browser confirmation flows should be tested with real owner, representative, and admin accounts.
- Some analytics and work-order views depend on database objects that may require migrations or seed data in a fresh project.
- E2E coverage is present, but this audit could not replace live role-account execution.

## Verification performed

- `npm test`: 5 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript checking and all 15 static/dynamic pages.
- Desktop and 390px browser viewport checks completed.
- Invalid login, signup field validation, unauthenticated report gating, and unauthenticated dashboard loading verified.
- No app-level horizontal overflow was found at 390px.
