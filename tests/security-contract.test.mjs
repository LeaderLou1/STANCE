import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("security migrations define ownership and moderation controls", () => {
  const sql = read("supabase/migrations/20260822_authorization_moderation.sql");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /moderation_status/);
  assert.match(sql, /audit_logs/);
  assert.match(sql, /reporter_id = auth\.uid\(\)/);
  assert.match(sql, /vote_for_issue/);
  assert.match(sql, /vote_for_comment/);
  assert.match(read("supabase/migrations/20260823_auth_profiles.sql"), /handle_new_user/);
  assert.match(read("supabase/migrations/20260823_auth_profiles.sql"), /'resident'/);
  assert.match(read("supabase/migrations/20260824_district_relationships.sql"), /resolve_district_for_zip/);
  assert.match(read("supabase/migrations/20260824_district_relationships.sql"), /district_zip_codes/);
  assert.match(read("supabase/migrations/20260824_district_relationships.sql"), /assign_representative_to_district/);
  assert.match(read("supabase/migrations/20260824_district_relationships.sql"), /p\.role = 'representative'/);
  assert.match(read("supabase/migrations/20260825_district_geometry.sql"), /postgis/);
  assert.match(read("scripts/seed-districts.ts"), /props\.coundist/);
});

test("mutations have server boundaries", () => {
  assert.match(read("src/lib/serverSupabase.ts"), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(read("app/api/issues/[id]/route.ts"), /export async function PATCH/);
  assert.match(read("app/api/issues/[id]/route.ts"), /export async function DELETE/);
  assert.match(read("app/api/comments/route.ts"), /reporter_id/);
  assert.match(read("app/api/issues/[id]/vote/route.ts"), /vote_for_issue/);
  assert.match(read("app/api/moderation/issues/[id]/route.ts"), /moderate_issue/);
  assert.match(read("app/api/health/route.ts"), /latency_ms/);
  assert.match(read("app/auth/page.tsx"), /resetPasswordForEmail/);
});

test("production documentation does not use starter content", () => {
  const readme = read("README.md");
  assert.match(readme, /STANCE/);
  assert.doesNotMatch(readme, /Create Next App/);
  assert.match(read("docs/PILOT_PLAN.md"), /Controlled Pilot Plan/);
});
