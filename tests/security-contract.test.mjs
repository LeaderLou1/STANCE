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
  const districtSignup = read("supabase/migrations/20261118000200_profile_council_district.sql");
  assert.match(districtSignup, /council_district/);
  assert.match(districtSignup, /district_id/);
  assert.match(districtSignup, /ZIPs can span multiple districts/);
  assert.match(read("supabase/migrations/20260825_district_geometry.sql"), /postgis/);
  assert.match(read("scripts/seed-districts.ts"), /properties\.coundist/);
  const repairSql = read("supabase/migrations/20261114000100_fix_production_contracts.sql");
  assert.match(repairSql, /find_similar_issues_v2/);
  assert.match(repairSql, /resolve_district_for_point/);
  assert.match(repairSql, /upsert_district_boundary/);
  assert.match(repairSql, /active_media_paths/);
  assert.match(repairSql, /actor_role is null or actor_role not in/);
  assert.match(repairSql, /p\.district_id = issues\.district_id/);
});

test("mutations have server boundaries", () => {
  assert.match(read("src/lib/serverSupabase.ts"), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(read("app/api/issues/[id]/route.ts"), /export async function PATCH/);
  assert.match(read("app/api/issues/[id]/route.ts"), /export async function DELETE/);
  assert.match(read("app/api/comments/route.ts"), /reporter_id/);
  assert.match(read("app/api/issues/[id]/vote/route.ts"), /vote_for_issue/);
  assert.match(read("app/api/moderation/issues/[id]/route.ts"), /moderate_issue/);
  assert.match(read("app/api/issues/[id]/vote/route.ts"), /createServerUserClient/);
  assert.match(read("app/api/moderation/issues/[id]/route.ts"), /createServerUserClient/);
  assert.match(read("app/api/health/route.ts"), /latency_ms/);
  assert.match(read("app/auth/page.tsx"), /resetPasswordForEmail/);
  assert.match(read("app/auth/page.tsx"), /NYC Council District/);
  assert.match(read("app/auth/page.tsx"), /council_district: councilDistrict/);
  assert.match(read("app/api/districts/route.ts"), /representativeName/);
});

test("comment moderation and private media are hardened", () => {
  const sql = read("supabase/migrations/20261118000100_harden_comment_moderation.sql");
  assert.match(sql, /moderation_status = 'Pending Review'/);
  assert.match(sql, /media_url like/);
  assert.match(sql, /c\.moderation_status = 'Approved'/);
  assert.match(sql, /i\.moderation_status = 'Approved'/);
  assert.match(read("src/components/DiscussionBoard.tsx"), /createSignedUrl/);
  assert.doesNotMatch(read("src/components/DiscussionBoard.tsx"), /getPublicUrl/);
});

test("app audit fixes are represented in source", () => {
  assert.match(read("next.config.ts"), /\/storage\/v1\/object\/sign\/\*\*/);
  assert.match(read("src/components/IssueCard.tsx"), /ownerId/);
  assert.match(read("src/components/IssueCard.tsx"), /Delete\?/);
  assert.match(read("src/components/IssueCard.tsx"), /Official Reply/);
  assert.match(read("src/components/ReportModal.tsx"), /Escape/);
  assert.match(read("src/components/ReportModal.tsx"), /aria-label="Close accountability report"/);
  assert.match(read("src/components/ReportModal.tsx"), /locationError/);
  assert.doesNotMatch(read("app/page.tsx"), /confirm\(|prompt\(/);
  assert.match(read("app/page.tsx"), /issuesError/);
  assert.match(read("app/page.tsx"), /actionError/);
  assert.match(read("src/components/AuthPanel.tsx"), /could not verify/);
});

test("incident selection focuses the single dashboard map", () => {
  const map = read("src/components/IncidentMap.tsx");
  const residentPortal = read("src/components/portals/ResidentPortal.tsx");
  assert.match(
    map,
    /map\.setView\(\[latitude, longitude\], zoom, \{ animate: false \}\)/,
  );
  assert.match(map, /\[latitude, longitude, zoom, focusRequest, map\]/);
  assert.match(map, /click: \(\) => onSelectIssue\?\.\(issue\)/);
  assert.match(map, /h-\[450px\] w-full/);
  assert.match(read("app/page.tsx"), /setMapZoom\(17\)/);
  assert.match(read("src/components/IssueCard.tsx"), /onSelectIssue\(issue\)/);
  assert.doesNotMatch(residentPortal, /IncidentMap|MapContainer/);
});

test("district directory and profiles expose council officials and public reports", () => {
  const districtProfileApi = read("app/api/districts/[number]/route.ts");
  assert.match(districtProfileApi, /moderation_status", "Approved"/);
  assert.match(districtProfileApi, /representatives/);
  assert.match(districtProfileApi, /officialDirectoryUrl/);
  assert.match(read("app/districts/page.tsx"), /DistrictDirectory/);
  assert.match(read("app/districts/[number]/page.tsx"), /parseDistrictNumber/);
  assert.match(read("app/districts/DistrictDirectory.tsx"), /\/districts\/\$\{district\.number\}/);
  assert.match(read("app/districts/[number]/DistrictProfile.tsx"), /Your elected official/);
  assert.match(read("app/page.tsx"), /href="\/districts"/);
});

test("production documentation does not use starter content", () => {
  const readme = read("README.md");
  assert.match(readme, /STANCE/);
  assert.doesNotMatch(readme, /Create Next App/);
  assert.match(read("docs/PILOT_PLAN.md"), /Controlled Pilot Plan/);
});
