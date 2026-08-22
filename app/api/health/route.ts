import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = createServerAdminClient();
    const { error } = await supabase.from("issues").select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "degraded", database: "error", latency_ms: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
