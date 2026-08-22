# Deployment

## Required services

- Supabase Auth, Postgres, Realtime, and private Storage
- A Next.js host with server environment variables
- A malware-scanning provider for uploaded media
- Error monitoring and uptime monitoring
- Transactional email/SMTP for confirmation and recovery flows
- Malware scanning and media cleanup scheduler

## Environment

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the deployment platform. The service-role key must be server-only.

Set `MEDIA_CLEANUP_TOKEN` and schedule `POST /api/maintenance/media-cleanup` from a trusted scheduler, sending the token as `x-maintenance-token`.

## Supabase checklist

1. Run all migrations in `supabase/migrations` in order.
2. Enable email authentication and configure confirmation redirects.
3. Verify `profiles.id` references `auth.users.id`; new accounts default to `resident`, and staff roles are granted only through the admin function.
4. Import official district boundaries into `districts` and `district_zip_codes`, then assign verified representatives to `profiles.district_id`.
4. Verify `issue-media` is private and storage policies are present.
5. Configure backups and test restore before accepting public reports.
6. Configure rate limits, CAPTCHA, SMTP, and malware scanning.

## Release gate

Run `npx tsc --noEmit`, `npm run lint`, `npm run build -- --webpack`, and `node --test tests/*.test.mjs`. Test sign-up, report creation, duplicate rejection, media upload, moderation, ownership rejection, and recovery email in a staging project.
