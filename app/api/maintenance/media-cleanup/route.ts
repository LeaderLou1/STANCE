import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";
import crypto from "crypto";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 100;

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

    const bucket = supabase.storage.from("issue-media");
    const unreferenced: string[] = [];

    const scanFolder = async (folder: string): Promise<void> => {
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data: entries, error } = await bucket.list(folder, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });
        if (error) throw error;
        if (!entries?.length) break;

        for (const entry of entries) {
          const path = folder ? `${folder}/${entry.name}` : entry.name;
          const isFolder = entry.id === null && entry.metadata === null;

          if (isFolder) {
            await scanFolder(path);
            continue;
          }

          const createdAt = entry.created_at
            ? Date.parse(entry.created_at)
            : Number.NaN;
          const isOld = Number.isFinite(createdAt)
            && Date.now() - createdAt > GRACE_PERIOD_MS;

          if (isOld && !activePaths.has(path)) {
            unreferenced.push(path);
          }
        }

        if (entries.length < PAGE_SIZE) break;
      }
    };

    await scanFolder("");

    let removedCount = 0;
    for (let index = 0; index < unreferenced.length; index += DELETE_BATCH_SIZE) {
      const batch = unreferenced.slice(index, index + DELETE_BATCH_SIZE);
      const { error } = await bucket.remove(batch);
      if (error) throw error;
      removedCount += batch.length;
    }

    return NextResponse.json({ removed_count: removedCount });
  } catch (error) {
    console.error("Media cleanup failed:", error);
    return NextResponse.json({ error: "Media cleanup failed." }, { status: 500 });
  }
}