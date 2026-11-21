import { NextResponse } from "next/server";
import { createServerUserClient, getBearerToken } from "@/src/lib/serverSupabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  // Parked for single-district MVP unless explicitly enabled
  if (process.env.NEXT_PUBLIC_ENABLE_VOTING !== "true") {
    return NextResponse.json(
      { error: "Group voting is disabled during the pilot." },
      { status: 410 }
    );
  }

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid issue ID format." }, { status: 400 });
    }

    const supabase = createServerUserClient(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("vote_for_issue", { p_issue_id: id });
    if (error) throw error;

    return NextResponse.json({ upvotes: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to record vote.";
    console.error("Issue vote API error:", message);
    return NextResponse.json({ error: "Unable to record vote." }, { status: 500 });
  }
}