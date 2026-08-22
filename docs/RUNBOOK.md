# Operations Runbook

## Report submission failures

Check the Next.js logs for `/api/issues`, then verify the server Supabase key, Auth session, RLS migration, rate-limit RPC, and duplicate-detection RPC. Never put the service-role key in browser code.

## Upload failures

Verify the private `issue-media` bucket, user-folder policy, storage quota, MIME/size limits, and malware scanner status. Delete orphaned objects after failed submissions using the scheduled cleanup job once configured.

## Moderation incident

Temporarily disable public approvals, preserve the audit log, identify affected reports, and notify the agency owner. Do not delete evidence before export and review.

## Abuse spike

Enable CAPTCHA, lower authenticated and IP limits, block abusive accounts at the provider edge, and preserve request metrics. Never rely on a client-side button disable for abuse prevention.

## Rollback

Deploy the previous immutable build, keep the database migration in place unless a reviewed rollback exists, and record the incident in the audit log. Test restoration in staging before production recovery.

## Monitoring

Track error rate, report creation success, duplicate rate, 429 responses, upload scan failures, moderation queue age, database latency, and realtime disconnects. Alert on sustained failures, not isolated user errors.
