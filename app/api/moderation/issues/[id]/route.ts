import { NextResponse } from "next/server";
import { createServerAdminClient, getBearerToken } from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ModerationBody {
  status?: string;
  reason?: string | null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const supabase = createServerAdminClient();
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "representative") {
      return NextResponse.json({ error: "Staff authorization required." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as ModerationBody;
    if (!body.status) return NextResponse.json({ error: "Moderation status is required." }, { status: 400 });
    const { error } = await supabase.rpc("moderate_issue", {
      p_issue_id: id,
      p_status: body.status,
      p_reason: body.reason ?? null,
    });
    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: authData.user.id,
      action: "MODERATE",
      entity_type: "issue",
      entity_id: id,
      metadata: { status: body.status, reason: body.reason ?? null },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Moderation API error:", error);
    return NextResponse.json({ error: "Unable to moderate report." }, { status: 500 });
  }
}
