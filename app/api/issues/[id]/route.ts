import { NextResponse } from "next/server";
import { createServerAdminClient, getBearerToken } from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateBody {
  title?: string;
  description?: string;
  category?: string;
  zip_code?: string;
  urgency?: string;
  status?: string;
  resolution_notes?: string | null;
}

async function authenticate(request: Request) {
  const token = getBearerToken(request);
  if (!token) return { supabase: null, user: null, profile: null };
  const supabase = createServerAdminClient();
  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  return { supabase, user: authData.user, profile };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, profile } = await authenticate(request);
    if (!supabase || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: issue } = await supabase
      .from("issues")
      .select("reporter_id, moderation_status")
      .eq("id", id)
      .maybeSingle();
    if (!issue) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    const staff = profile?.role === "representative" || profile?.role === "admin";
    if (!staff && (issue.reporter_id !== user.id || issue.moderation_status !== "Pending Review")) {
      return NextResponse.json({ error: "You cannot edit this report." }, { status: 403 });
    }

    const body = (await request.json()) as UpdateBody;
    const update: UpdateBody & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.description === "string") update.description = body.description.trim();
    if (typeof body.category === "string") update.category = body.category.trim();
    if (typeof body.zip_code === "string") update.zip_code = body.zip_code.trim();
    if (typeof body.urgency === "string") update.urgency = body.urgency;
    if (staff && typeof body.status === "string") update.status = body.status;
    if (staff && body.resolution_notes !== undefined) update.resolution_notes = body.resolution_notes;

    const { error } = await supabase.from("issues").update(update).eq("id", id);
    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "UPDATE",
      entity_type: "issue",
      entity_id: id,
      metadata: { staff, fields: Object.keys(update) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Issue update API error:", error);
    return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, profile } = await authenticate(request);
    if (!supabase || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: issue } = await supabase.from("issues").select("reporter_id").eq("id", id).maybeSingle();
    if (!issue) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (issue.reporter_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ error: "You cannot delete this report." }, { status: 403 });
    }
    const { error } = await supabase.from("issues").delete().eq("id", id);
    if (error) throw error;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "DELETE",
      entity_type: "issue",
      entity_id: id,
      metadata: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Issue delete API error:", error);
    return NextResponse.json({ error: "Unable to delete report." }, { status: 500 });
  }
}
