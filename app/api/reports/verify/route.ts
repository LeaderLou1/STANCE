
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export async function POST(request: Request) {
  try {
    const declaredLength = Number(
      request.headers.get("content-length") ?? 0
    );

    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }

    const reader = request.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Request body is required." },
        { status: 400 }
      );
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;

        if (totalBytes > MAX_BODY_BYTES) {
          await reader.cancel();
          return NextResponse.json(
            { error: "Request body is too large." },
            { status: 413 }
          );
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bodyText = new TextDecoder().decode(
      Buffer.concat(chunks)
    );

    let body: unknown;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 }
      );
    }

    const token =
      typeof body === "object" &&
      body !== null &&
      "token" in body
        ? (body as { token?: unknown }).token
        : undefined;

    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const now = new Date().toISOString();

    const { data, error } = await createServerAdminClient()
      .from("reports")
      .update({
        reporter_email_verified_at: now,
        email_verification_token_hash: null,
        email_verification_expires_at: null,
      })
      .eq("email_verification_token_hash", hash)
      .gt("email_verification_expires_at", now)
      .is("reporter_email_verified_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Email verification failed:", error.message);

      return NextResponse.json(
        { error: "Unable to verify your email right now." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error(
      "Email verification error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Unable to verify your email right now." },
      { status: 500 }
    );
  }
}
