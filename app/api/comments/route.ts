
import { NextResponse } from "next/server";
import {
  createServerAdminClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

interface CommentBody {
  issue_id?: unknown;
  parent_id?: unknown;
  content?: unknown;
  media_url?: unknown;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(request: Request) {
  try {
    // Authenticate the requesting user.
    const token = getBearerToken(request);

    if (!token) {
      return jsonResponse(
        { error: "Authentication required." },
        401,
      );
    }

    const supabase = createServerAdminClient();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return jsonResponse(
        { error: "Invalid authentication session." },
        401,
      );
    }

    // Parse and validate the request body.
    let body: CommentBody;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON request body." },
        400,
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        { error: "A valid comment payload is required." },
        400,
      );
    }

    const issueId =
      typeof body.issue_id === "string"
        ? body.issue_id.trim()
        : "";

    const parentId =
      body.parent_id === null ||
      body.parent_id === undefined
        ? null
        : typeof body.parent_id === "string"
          ? body.parent_id.trim()
          : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const mediaUrl =
      body.media_url === null ||
      body.media_url === undefined
        ? null
        : typeof body.media_url === "string"
          ? body.media_url.trim()
          : "";

    if (!UUID_REGEX.test(issueId)) {
      return jsonResponse(
        { error: "A valid issue ID is required." },
        400,
      );
    }

    if (
      parentId !== null &&
      !UUID_REGEX.test(parentId)
    ) {
      return jsonResponse(
        { error: "A valid parent comment ID is required." },
        400,
      );
    }

    if (
      content.length === 0 &&
      !mediaUrl
    ) {
      return jsonResponse(
        { error: "A comment or attachment is required." },
        400,
      );
    }

    if (content.length > 2000) {
      return jsonResponse(
        { error: "Comments must be 2,000 characters or fewer." },
        400,
      );
    }

    // Validate attachment ownership and storage path.
    if (
      mediaUrl !== null &&
      (
        !mediaUrl ||
        mediaUrl.length > 500 ||
        mediaUrl.includes("..") ||
        mediaUrl.includes("\\") ||
        !mediaUrl.startsWith(`${authData.user.id}/`)
      )
    ) {
      return jsonResponse(
        { error: "Attachment ownership could not be verified." },
        403,
      );
    }

    // Only allow comments on publicly approved issues.
    const {
      data: issue,
      error: issueError,
    } = await supabase
      .from("issues")
      .select("id, moderation_status")
      .eq("id", issueId)
      .eq("moderation_status", "Approved")
      .maybeSingle();

    if (issueError) throw issueError;

    if (!issue) {
      return jsonResponse(
        {
          error: "The issue does not exist or is not available for comments.",
        },
        404,
      );
    }

    // Ensure replies belong to the same issue.
    if (parentId) {
      const {
        data: parent,
        error: parentError,
      } = await supabase
        .from("comments")
        .select("id, issue_id, moderation_status")
        .eq("id", parentId)
        .eq("issue_id", issueId)
        .eq("moderation_status", "Approved")
        .maybeSingle();

      if (parentError) throw parentError;

      if (!parent) {
        return jsonResponse(
          {
            error: "Parent comment was not found or is not available for replies.",
          },
          400,
        );
      }
    }

    // Verify the attachment exists in the user's storage folder.
    if (mediaUrl) {
      const [userFolder, ...pathParts] = mediaUrl.split("/");
      const fileName = pathParts.join("/");

      if (
        userFolder !== authData.user.id ||
        !fileName ||
        pathParts.length !== 1
      ) {
        return jsonResponse(
          { error: "Invalid attachment storage path." },
          400,
        );
      }

      const {
        data: files,
        error: storageError,
      } = await supabase.storage
        .from("issue-media")
        .list(userFolder, {
          search: fileName,
          limit: 10,
        });

      if (storageError) throw storageError;

      if (!files?.some((file) => file.name === fileName)) {
        return jsonResponse(
          { error: "Attachment could not be verified." },
          403,
        );
      }
    }

    // Create the comment pending moderation.
    const {
      data: comment,
      error: insertError,
    } = await supabase
      .from("comments")
      .insert({
        issue_id: issueId,
        parent_id: parentId,
        content,
        media_url: mediaUrl,
        reporter_id: authData.user.id,
        moderation_status: "Pending Review",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Record the action for accountability.
    const {
      error: auditError,
    } = await supabase
      .from("audit_logs")
      .insert({
        actor_id: authData.user.id,
        action: "CREATE",
        entity_type: "comment",
        entity_id: comment.id,
        metadata: {
          issue_id: issueId,
        },
      });

    if (auditError) {
      console.error(
        "Comment audit logging failed:",
        auditError,
      );
    }

    return jsonResponse(
      {
        id: comment.id,
        status: "Pending Review",
        auditLogged: !auditError,
      },
      201,
    );
  } catch (error) {
    console.error("Comment API error:", error);

    return jsonResponse(
      { error: "Unable to post comment." },
      500,
    );
  }
}
