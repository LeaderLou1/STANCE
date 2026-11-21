
import { NextResponse } from "next/server";
import {
  createServerAdminClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Profile {
  role: string;
  district_id: string | null;
}

interface AuthResult {
  supabase: ReturnType<typeof createServerAdminClient> | null;
  user: { id: string } | null;
  profile: Profile | null;
  failure: "missing" | "invalid" | "profile" | null;
}

const URGENCY_VALUES = [
  "Low Priority",
  "Medium Baseline",
  "High Breakdown",
  "Critical Danger",
] as const;

const STATUS_VALUES = [
  "Submitted",
  "In Progress",
  "Pending Resolution",
  "Resolved",
] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  );
}

async function authenticate(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      supabase: null,
      user: null,
      profile: null,
      failure: "missing",
    };
  }

  const supabase = createServerAdminClient();

  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return {
      supabase,
      user: null,
      profile: null,
      failure: "invalid",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, district_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      supabase,
      user: authData.user,
      profile: null,
      failure: "profile",
    };
  }

  return {
    supabase,
    user: authData.user,
    profile,
    failure: null,
  };
}

function validateAuthentication(auth: AuthResult) {
  if (auth.failure === "missing" || auth.failure === "invalid") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (auth.failure === "profile" || !auth.profile) {
    return NextResponse.json(
      { error: "Unable to verify your account permissions." },
      { status: 403 },
    );
  }

  return null;
}

async function writeAuditLog(
  supabase: ReturnType<typeof createServerAdminClient>,
  entry: {
    actor_id: string;
    action: "UPDATE" | "DELETE";
    entity_type: "issue";
    entity_id: string;
    metadata: Record<string, unknown>;
  },
): Promise<boolean> {
  const { error } = await supabase.from("audit_logs").insert(entry);

  if (error) {
    console.error("Issue audit log error:", error);
    return false;
  }

  return true;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "Invalid report ID." },
        { status: 400 },
      );
    }

    const auth = await authenticate(request);
    const authResponse = validateAuthentication(auth);

    if (authResponse) return authResponse;

    const { supabase, user, profile } = auth;

    if (!supabase || !user || !profile) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .select("reporter_id, moderation_status, district_id")
      .eq("id", id)
      .maybeSingle();

    if (issueError) throw issueError;

    if (!issue) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 },
      );
    }

    const isAdmin = profile.role === "admin";
    const isRepresentative = profile.role === "representative";
    const isOwner = issue.reporter_id === user.id;

    const assignedRepresentative = Boolean(
      isRepresentative &&
        profile.district_id &&
        profile.district_id === issue.district_id,
    );

    const isPendingOwner =
      profile.role === "resident" &&
      isOwner &&
      issue.moderation_status === "Pending Review";

    if (
      (isRepresentative && !assignedRepresentative) ||
      (!isAdmin && !assignedRepresentative && !isPendingOwner)
    ) {
      return NextResponse.json(
        { error: "You cannot edit this report." },
        { status: 403 },
      );
    }

    const rawBody: unknown = await request.json().catch(() => null);

    if (!isRecord(rawBody)) {
      return NextResponse.json(
        { error: "A valid JSON object is required." },
        { status: 400 },
      );
    }

    const body = rawBody;
    const has = (field: string) =>
      Object.prototype.hasOwnProperty.call(body, field);

    const staff = isAdmin || assignedRepresentative;

    if (
      assignedRepresentative &&
      !isAdmin &&
      [
        "title",
        "description",
        "category",
        "zip_code",
        "urgency",
        "lat",
        "lng",
      ].some(has)
    ) {
      return NextResponse.json(
        {
          error:
            "Representatives may update status and official notes only.",
        },
        { status: 403 },
      );
    }

    if (
      !staff &&
      (has("status") || has("resolution_notes"))
    ) {
      return NextResponse.json(
        {
          error:
            "Only assigned staff may update report status or official notes.",
        },
        { status: 403 },
      );
    }

    const update: Record<string, unknown> = {};

    // Title
    if (has("title")) {
      if (typeof body.title !== "string") {
        return NextResponse.json(
          { error: "Title must be text." },
          { status: 400 },
        );
      }

      const title = body.title.trim();

      if (title.length < 5 || title.length > 120) {
        return NextResponse.json(
          { error: "Title must be 5 to 120 characters." },
          { status: 400 },
        );
      }

      update.title = title;
    }

    // Description
    if (has("description")) {
      if (typeof body.description !== "string") {
        return NextResponse.json(
          { error: "Description must be text." },
          { status: 400 },
        );
      }

      const description = body.description.trim();

      if (description.length < 10 || description.length > 2000) {
        return NextResponse.json(
          { error: "Description must be 10 to 2,000 characters." },
          { status: 400 },
        );
      }

      update.description = description;
    }

    // Category
    if (has("category")) {
      if (typeof body.category !== "string") {
        return NextResponse.json(
          { error: "Category must be text." },
          { status: 400 },
        );
      }

      const category = body.category.trim();

      if (!category || category.length > 80) {
        return NextResponse.json(
          { error: "Category must be 1 to 80 characters." },
          { status: 400 },
        );
      }

      update.category = category;
    }

    // ZIP is metadata only. It never determines district assignment.
    if (has("zip_code")) {
      if (
        typeof body.zip_code !== "string" ||
        !/^\d{5}$/.test(body.zip_code.trim())
      ) {
        return NextResponse.json(
          { error: "A valid 5-digit ZIP code is required." },
          { status: 400 },
        );
      }

      update.zip_code = body.zip_code.trim();
    }

    // Urgency
    if (has("urgency")) {
      if (!isOneOf(body.urgency, URGENCY_VALUES)) {
        return NextResponse.json(
          { error: "Invalid urgency value." },
          { status: 400 },
        );
      }

      update.urgency = body.urgency;
    }

    // Staff-only status
    if (has("status")) {
      if (!staff) {
        return NextResponse.json(
          { error: "Staff authorization required." },
          { status: 403 },
        );
      }

      if (!isOneOf(body.status, STATUS_VALUES)) {
        return NextResponse.json(
          { error: "Invalid issue status." },
          { status: 400 },
        );
      }

      update.status = body.status;
    }

    // Staff-only official notes
    if (has("resolution_notes")) {
      if (!staff) {
        return NextResponse.json(
          { error: "Staff authorization required." },
          { status: 403 },
        );
      }

      if (
        body.resolution_notes !== null &&
        typeof body.resolution_notes !== "string"
      ) {
        return NextResponse.json(
          { error: "Resolution notes must be text or null." },
          { status: 400 },
        );
      }

      const notes =
        typeof body.resolution_notes === "string"
          ? body.resolution_notes.trim()
          : null;

      if (notes && notes.length > 2000) {
        return NextResponse.json(
          { error: "Resolution notes cannot exceed 2,000 characters." },
          { status: 400 },
        );
      }

      update.resolution_notes = notes || null;
    }

    // Geographic updates: coordinates must be supplied together.
    const hasLat = has("lat");
    const hasLng = has("lng");

    if (hasLat !== hasLng) {
      return NextResponse.json(
        { error: "Latitude and longitude must be provided together." },
        { status: 400 },
      );
    }

    if (hasLat && hasLng) {
      const lat = body.lat;
      const lng = body.lng;

      if (lat === null && lng === null) {
        update.lat = null;
        update.lng = null;
        update.district_id = null;
      } else {
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return NextResponse.json(
            { error: "Valid latitude and longitude are required." },
            { status: 400 },
          );
        }

        if (
          lat < 40.4 ||
          lat > 41 ||
          lng < -74.3 ||
          lng > -73.6
        ) {
          return NextResponse.json(
            { error: "Location must be within NYC." },
            { status: 400 },
          );
        }

        const { data: districtId, error: districtError } =
          await supabase.rpc("resolve_district_for_point", {
            p_lat: lat,
            p_lng: lng,
          });

        if (districtError) throw districtError;

        if (typeof districtId !== "string" || !districtId) {
          return NextResponse.json(
            {
              error:
                "Could not determine the council district for this location.",
            },
            { status: 422 },
          );
        }

        update.lat = lat;
        update.lng = lng;
        update.district_id = districtId;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 },
      );
    }

    update.updated_at = new Date().toISOString();

    // Repeat authorization constraints in the UPDATE query to reduce
    // the risk of a permission change between the initial read and write.
    let updateQuery = supabase
      .from("issues")
      .update(update)
      .eq("id", id);

    if (!isAdmin && !assignedRepresentative) {
      updateQuery = updateQuery
        .eq("reporter_id", user.id)
        .eq("moderation_status", "Pending Review");
    }

    if (assignedRepresentative && !isAdmin) {
      updateQuery = updateQuery.eq(
        "district_id",
        profile.district_id as string,
      );
    }

    const { data: updatedIssue, error: updateError } =
      await updateQuery.select("id").maybeSingle();

    if (updateError) throw updateError;

    if (!updatedIssue) {
      return NextResponse.json(
        {
          error:
            "The report changed or is no longer available for editing.",
        },
        { status: 409 },
      );
    }

    const auditLogged = await writeAuditLog(supabase, {
      actor_id: user.id,
      action: "UPDATE",
      entity_type: "issue",
      entity_id: id,
      metadata: {
        staff,
        fields: Object.keys(update),
      },
    });

    return NextResponse.json({
      ok: true,
      auditLogged,
    });
  } catch (error: unknown) {
    console.error("Issue update API error:", error);

    return NextResponse.json(
      { error: "Unable to update report." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "Invalid report ID." },
        { status: 400 },
      );
    }

    const auth = await authenticate(request);
    const authResponse = validateAuthentication(auth);

    if (authResponse) return authResponse;

    const { supabase, user, profile } = auth;

    if (!supabase || !user || !profile) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .select("reporter_id, moderation_status")
      .eq("id", id)
      .maybeSingle();

    if (issueError) throw issueError;

    if (!issue) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 },
      );
    }

    const isAdmin = profile.role === "admin";

    const isPendingOwner =
      profile.role === "resident" &&
      issue.reporter_id === user.id &&
      issue.moderation_status === "Pending Review";

    if (!isAdmin && !isPendingOwner) {
      return NextResponse.json(
        { error: "You cannot delete this report." },
        { status: 403 },
      );
    }

    let deleteQuery = supabase
      .from("issues")
      .delete()
      .eq("id", id);

    if (!isAdmin) {
      deleteQuery = deleteQuery
        .eq("reporter_id", user.id)
        .eq("moderation_status", "Pending Review");
    }

    const { data: deletedIssue, error: deleteError } =
      await deleteQuery.select("id").maybeSingle();

    if (deleteError) throw deleteError;

    if (!deletedIssue) {
      return NextResponse.json(
        {
          error:
            "The report changed or is no longer available for deletion.",
        },
        { status: 409 },
      );
    }

    const auditLogged = await writeAuditLog(supabase, {
      actor_id: user.id,
      action: "DELETE",
      entity_type: "issue",
      entity_id: id,
      metadata: {
        deleted_by: user.id,
        is_admin: isAdmin,
      },
    });

    return NextResponse.json({
      ok: true,
      auditLogged,
    });
  } catch (error: unknown) {
    console.error("Issue delete API error:", error);

    return NextResponse.json(
      { error: "Unable to delete report." },
      { status: 500 },
    );
  }
}
