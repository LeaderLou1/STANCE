import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const expectedToken = process.env.MEDIA_CLEANUP_TOKEN;
  const providedToken = request.headers.get("x-maintenance-token");
  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createServerAdminClient();
    const [{ data: issues }, { data: comments }] = await Promise.all([
      supabase.from("issues").select("resolution_proof_url"),
      supabase.from("comments").select("media_url"),
    ]);
    const referenced = new Set(
      [
        ...(issues ?? []).map((row) => row.resolution_proof_url),
        ...(comments ?? []).map((row) => row.media_url),
      ].filter(Boolean),
    );
    const { data: folders, error: folderError } = await supabase.storage
      .from("issue-media")
      .list("", { limit: 1000 });
    if (folderError) throw folderError;

    const removed: string[] = [];
    for (const folder of folders ?? []) {
      if (!folder.id) continue;
      const { data: files, error } = await supabase.storage
        .from("issue-media")
        .list(folder.name, { limit: 1000 });
      if (error) throw error;
      for (const file of files ?? []) {
        const path = `${folder.name}/${file.name}`;
        const createdAt = file.created_at ? Date.parse(file.created_at) : Date.now();
        if (!referenced.has(path) && Date.now() - createdAt > GRACE_PERIOD_MS) {
          const { error: removeError } = await supabase.storage.from("issue-media").remove([path]);
          if (removeError) throw removeError;
          removed.push(path);
        }
      }
    }
    return NextResponse.json({ removed_count: removed.length });
  } catch (error) {
    console.error("Media cleanup failed:", error);
    return NextResponse.json({ error: "Media cleanup failed." }, { status: 500 });
  }
}
