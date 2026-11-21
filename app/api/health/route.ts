
import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = createServerAdminClient();

    const { error } = await supabase
      .from("issues")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Health check database query failed:", error.message);
      throw error;
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        latency_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        status: "degraded",
        database: "error",
        latency_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
