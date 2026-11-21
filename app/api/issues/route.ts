
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been retired. Submit guest reports through /api/reports.",
    },
    { status: 410 }
  );
}
