
import { NextResponse } from "next/server";
import {
  createServerUserClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function respond(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: HEADERS,
  });
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return respond(
        { error: "Authentication required." },
        401,
      );
    }

    const supabase = createServerUserClient(token);

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return respond(
        { error: "Invalid authentication session." },
        401,
      );
    }

    const { id } = await context.params;

    if (!UUID_REGEX.test(id)) {
      return respond(
        { error: "Invalid comment ID." },
        400,
      );
    }

    const {
      data: upvotes,
      error,
    } = await supabase.rpc("vote_for_comment", {
      p_comment_id: id,
    });

    if (error) {
      console.error("Comment vote RPC failed:", error);

      return respond(
        { error: "Unable to record comment vote." },
        400,
      );
    }

    if (
      typeof upvotes !== "number" ||
      !Number.isInteger(upvotes) ||
      upvotes < 0
    ) {
      console.error(
        "Unexpected vote_for_comment response:",
        upvotes,
      );

      return respond(
        { error: "Unexpected voting response." },
        500,
      );
    }

    return respond({ upvotes });
  } catch (error) {
    console.error("Comment vote API error:", error);

    return respond(
      { error: "Unable to record comment vote." },
      500,
    );
  }
}
