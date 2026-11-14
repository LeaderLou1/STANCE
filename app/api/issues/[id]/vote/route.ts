import { NextResponse } from "next/server";
import { createServerUserClient, getBearerToken } from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const supabase = createServerUserClient(token);
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    const { id } = await context.params;
    const { data, error } = await supabase.rpc("vote_for_issue", { p_issue_id: id });
    if (error) throw error;
    return NextResponse.json({ upvotes: data });
  } catch (error) {
    console.error("Issue vote API error:", error);
    return NextResponse.json({ error: "Unable to record vote." }, { status: 500 });
  }
}
