import { NextResponse } from "next/server";
import {
  createServerAdminClient,
  createServerUserClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

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
    const callerClient = createServerUserClient(token);
    const { data: authData } = await callerClient.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "representative") {
      return NextResponse.json({ error: "Staff authorization required." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as ModerationBody;
    const allowedStatuses = new Set([
      "Pending Review",
      "Approved",
      "Rejected",
      "Needs Information",
    ]);
    if (!body.status || !allowedStatuses.has(body.status)) {
      return NextResponse.json({ error: "A valid moderation status is required." }, { status: 400 });
    }

    if (profile.role === "representative") {
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .select("district_id")
        .eq("id", id)
        .maybeSingle();
      if (issueError) throw issueError;
      const { data: representative } = await supabase
        .from("profiles")
        .select("district_id")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!issue || !representative?.district_id || issue.district_id !== representative.district_id) {
        return NextResponse.json({ error: "This report is outside your assigned district." }, { status: 403 });
      }
    }

    const { error } = await callerClient.rpc("moderate_issue", {
      p_issue_id: id,
      p_status: body.status,
      p_reason: body.reason ?? null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Moderation API error:", error);
    return NextResponse.json({ error: "Unable to moderate report." }, { status: 500 });
  }
}
