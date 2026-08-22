import { NextResponse } from "next/server";
import { createServerAdminClient, getBearerToken } from "@/src/lib/serverSupabase";

interface CommentBody {
  issue_id?: string;
  parent_id?: string | null;
  content?: string;
  media_url?: string | null;
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const supabase = createServerAdminClient();
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });

    const body = (await request.json()) as CommentBody;
    const content = body.content?.trim() || "";
    if (!body.issue_id || (content.length === 0 && !body.media_url)) {
      return NextResponse.json({ error: "A comment or attachment is required." }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Comments must be 2,000 characters or fewer." }, { status: 400 });
    }
    if (body.media_url && !body.media_url.startsWith(`${authData.user.id}/`)) {
      return NextResponse.json({ error: "Attachment ownership could not be verified." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        issue_id: body.issue_id,
        parent_id: body.parent_id ?? null,
        content,
        media_url: body.media_url ?? null,
        reporter_id: authData.user.id,
        moderation_status: "Pending Review",
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("audit_logs").insert({
      actor_id: authData.user.id,
      action: "CREATE",
      entity_type: "comment",
      entity_id: data.id,
      metadata: { issue_id: body.issue_id },
    });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Comment API error:", error);
    return NextResponse.json({ error: "Unable to post comment." }, { status: 500 });
  }
}
