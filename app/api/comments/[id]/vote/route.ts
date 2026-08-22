import { NextResponse } from "next/server";
import { createServerAdminClient, getBearerToken } from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const supabase = createServerAdminClient();
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    const { id } = await context.params;
    const { data, error } = await supabase.rpc("vote_for_comment", { p_comment_id: id });
    if (error) throw error;
    return NextResponse.json({ upvotes: data });
  } catch (error) {
    console.error("Comment vote API error:", error);
    return NextResponse.json({ error: "Unable to record comment vote." }, { status: 500 });
  }
}
