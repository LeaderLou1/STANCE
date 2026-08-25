import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";
import crypto from "crypto";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

function verifyToken(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const p = Buffer.from(provided);
  const e = Buffer.from(expected);
  return p.length === e.length && crypto.timingSafeEqual(p, e);
}

export async function POST(request: Request) {
  const expectedToken = process.env.MEDIA_CLEANUP_TOKEN;
  const providedToken = request.headers.get("x-maintenance-token");

  if (!expectedToken || !verifyToken(providedToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createServerAdminClient();

    // 1. Fetch only active paths via database index
    const { data: activeRows, error: dbError } = await supabase
      .from("active_media_paths")
      .select("storage_path");

    if (dbError) throw dbError;
    const activePaths = new Set(activeRows.map((r) => r.storage_path));

    // 2. Paginate top-level directory listing in chunks
    const { data: files, error: storageError } = await supabase.storage
      .from("issue-media")
      .list("", { limit: 100, sortBy: { column: "created_at", order: "asc" } });

    if (storageError) throw storageError;

    const toDelete: string[] = [];

    for (const file of files ?? []) {
      const createdAt = file.created_at ? Date.parse(file.created_at) : Date.now();
      
      // If file is older than 24h and not in active view, mark for batch removal
      if (!activePaths.has(file.name) && Date.now() - createdAt > GRACE_PERIOD_MS) {
        toDelete.push(file.name);
      }
    }

    // 3. Perform a single batch deletion API call (up to 100 files at once)
    if (toDelete.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("issue-media")
        .remove(toDelete);

      if (removeError) throw removeError;
    }

    return NextResponse.json({ removed_count: toDelete.length, removed: toDelete });
  } catch (error) {
    console.error("Media cleanup failed:", error);
    return NextResponse.json({ error: "Media cleanup failed." }, { status: 500 });
  }
}