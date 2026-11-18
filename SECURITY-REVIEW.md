# Security Review Summary

Date: 2026-11-18

## Findings remediated

| Severity | File | Finding |
|---|---|---|
| Medium | `supabase/migrations/20260822_authorization_moderation.sql` | Comment insert RLS did not require pending moderation, allowing direct approved comments. |
| Medium | `src/components/DiscussionBoard.tsx` | Relative media paths used public-bucket URLs for a private Supabase bucket. |
| Medium | `supabase/migrations/20260821_production_security.sql` | Storage read policy exposed issue media to every authenticated user. |

## Remediation

- Added a forward SQL migration requiring direct comment inserts to use `Pending Review` and an uploader-owned media path.
- Replaced public media URL resolution with short-lived signed URLs.
- Restricted issue-media reads to the uploader, staff, and media referenced by approved public comments or approved issues.
