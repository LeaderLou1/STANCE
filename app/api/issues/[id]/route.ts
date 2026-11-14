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
  lat?: number | null;
  lng?: number | null;
}

async function authenticate(request: Request) {
  const token = getBearerToken(request);
  if (!token) return { supabase: null, user: null, profile: null };
  const supabase = createServerAdminClient();
  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, district_id")
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
      .select("reporter_id, moderation_status, district_id")
      .eq("id", id)
      .maybeSingle();
    if (!issue) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    const isAdmin = profile?.role === "admin";
    const isRepresentative = profile?.role === "representative";
    const isOwner = issue.reporter_id === user.id;
    const assignedRepresentative =
      isRepresentative &&
      profile?.district_id &&
      profile.district_id === issue.district_id;

    if (
      isRepresentative && !assignedRepresentative ||
      !isAdmin && !assignedRepresentative &&
        (!isOwner || issue.moderation_status !== "Pending Review")
    ) {
      return NextResponse.json({ error: "You cannot edit this report." }, { status: 403 });
    }

    const body = (await request.json()) as UpdateBody;
    const staff = Boolean(isAdmin || assignedRepresentative);
    if (
      assignedRepresentative &&
      !isAdmin &&
      (body.title !== undefined ||
        body.description !== undefined ||
        body.category !== undefined ||
        body.zip_code !== undefined ||
        body.urgency !== undefined ||
        body.lat !== undefined ||
        body.lng !== undefined)
    ) {
      return NextResponse.json(
        { error: "Representatives may update status and official notes only." },
        { status: 403 },
      );
    }
    const update: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (title.length < 5 || title.length > 120) {
        return NextResponse.json({ error: "Title must be 5 to 120 characters." }, { status: 400 });
      }
      update.title = title;
    }

    if (typeof body.description === "string") {
      const description = body.description.trim();
      if (description.length < 10 || description.length > 2000) {
        return NextResponse.json({ error: "Description must be 10 to 2,000 characters." }, { status: 400 });
      }
      update.description = description;
    }

    if (typeof body.category === "string") {
      const category = body.category.trim();
      if (!category) return NextResponse.json({ error: "Category cannot be empty." }, { status: 400 });
      update.category = category;
    }

    if (typeof body.zip_code === "string") {
      const zipCode = body.zip_code.trim();
      if (!/^\d{5}$/.test(zipCode)) {
        return NextResponse.json({ error: "A valid 5-digit ZIP code is required." }, { status: 400 });
      }
      update.zip_code = zipCode;
    }

    if (typeof body.urgency === "string") {
      if (!(["Low Priority", "Medium Baseline", "High Breakdown", "Critical Danger"] as const).includes(body.urgency as never)) {
        return NextResponse.json({ error: "Invalid urgency value." }, { status: 400 });
      }
      update.urgency = body.urgency;
    }

    if (staff) {
      if (typeof body.status === "string") {
        if (!(["Submitted", "In Progress", "Pending Resolution", "Resolved"] as const).includes(body.status as never)) {
          return NextResponse.json({ error: "Invalid issue status." }, { status: 400 });
        }
        update.status = body.status;
      }
      if (body.resolution_notes !== undefined) {
        update.resolution_notes = typeof body.resolution_notes === "string" 
          ? body.resolution_notes.trim() || null 
          : null;
      }
    } else if (body.status !== undefined || body.resolution_notes !== undefined) {
      return NextResponse.json({ error: "Only assigned staff may update report status or official notes." }, { status: 403 });
    }

    if (typeof body.lat === "number" || typeof body.lng === "number" || typeof body.zip_code === "string") {
      const lat = typeof body.lat === "number" ? body.lat : null;
      const lng = typeof body.lng === "number" ? body.lng : null;
      let districtId: string | null = null;

      if (lat !== null && lng !== null) {
        if (lat < 40.4 || lat > 41 || lng < -74.3 || lng > -73.6) {
          return NextResponse.json({ error: "Location must be within NYC." }, { status: 400 });
        }
        const { data, error } = await supabase.rpc("resolve_district_for_point", {
          p_lat: lat,
          p_lng: lng,
        });
        if (error) throw error;
        districtId = data ?? null;
        update.lat = lat;
        update.lng = lng;
      }

      const zipCode = typeof body.zip_code === "string" ? body.zip_code.trim() : undefined;
      if (zipCode !== undefined) {
        if (!/^\d{5}$/.test(zipCode)) {
          return NextResponse.json({ error: "A valid 5-digit ZIP code is required." }, { status: 400 });
        }
        update.zip_code = zipCode;
        if (!districtId) {
          const { data, error } = await supabase.rpc("resolve_district_for_zip", {
            p_zip_code: zipCode,
          });
          if (error) throw error;
          districtId = data ?? null;
        }
      }
      update.district_id = districtId;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields provided for update." }, { status: 400 });
    }
    update.updated_at = new Date().toISOString();

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

    const { data: issue } = await supabase.from("issues").select("reporter_id, moderation_status").eq("id", id).maybeSingle();
    if (!issue) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    const canDelete =
      profile?.role === "admin" ||
      (issue.reporter_id === user.id && issue.moderation_status === "Pending Review");
    if (!canDelete) {
      return NextResponse.json({ error: "You cannot delete this report." }, { status: 403 });
    }

    const { error } = await supabase.from("issues").delete().eq("id", id);
    if (error) throw error;

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "DELETE",
      entity_type: "issue",
      entity_id: id,
      metadata: { deleted_by: user.id, is_admin: profile?.role === "admin" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Issue delete API error:", error);
    return NextResponse.json({ error: "Unable to delete report." }, { status: 500 });
  }
}