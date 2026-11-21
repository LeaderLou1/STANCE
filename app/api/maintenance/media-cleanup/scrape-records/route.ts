
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) return false;

  const provided = Buffer.from(
    request.headers.get("authorization") ?? ""
  );

  const expected = Buffer.from(`Bearer ${secret}`);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      skipped: true,
      message:
        "Permit ingestion is parked until a stable source identifier and database uniqueness constraint are configured.",
    },
    { status: 200 }
  );
}
