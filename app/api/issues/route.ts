import { NextResponse } from "next/server";
import {
  createServerAdminClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

interface ReportBody {
  title?: string;
  description?: string;
  category?: string;
  zip_code?: string;
  urgency?: string;
  lat?: number | null;
  lng?: number | null;
  resolution_proof_url?: string | null;
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const supabase = createServerAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication session." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ReportBody;

    const title = body.title?.trim() || "";
    const description = body.description?.trim() || "";
    const category = body.category?.trim() || "";
    const zipCode = body.zip_code?.trim() || "";

    if (title.length < 5 || title.length > 120) {
      return NextResponse.json(
        { error: "Title must be 5 to 120 characters." },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 10 to 2,000 characters." },
        { status: 400 }
      );
    }

    if (!category || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json(
        {
          error: "Category and a valid ZIP code are required.",
        },
        { status: 400 }
      );
    }

    // Validate coordinates if provided.
    let lat: number | null = null;
    let lng: number | null = null;

    if (typeof body.lat === "number" && typeof body.lng === "number") {
      if (
        body.lat >= -90 &&
        body.lat <= 90 &&
        body.lng >= -180 &&
        body.lng <= 180
      ) {
        lat = body.lat;
        lng = body.lng;
      } else {
        return NextResponse.json(
          { error: "Invalid coordinates provided." },
          { status: 400 }
        );
      }
    }

    // Basic rate limiting.
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() || "unknown";

    const userLimit = await supabase.rpc(
      "consume_report_rate_limit",
      {
        p_bucket_key: `user:${user.id}`,
        p_limit: 10,
        p_window: "1 hour",
      }
    );

    const ipLimit = await supabase.rpc(
      "consume_report_rate_limit",
      {
        p_bucket_key: `ip:${ipAddress}`,
        p_limit: 20,
        p_window: "1 hour",
      }
    );

    if (userLimit.error || ipLimit.error) {
      console.error(
        "Rate-limit check failed:",
        userLimit.error || ipLimit.error
      );

      return NextResponse.json(
        {
          error:
            "Report protection is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (!userLimit.data || !ipLimit.data) {
      return NextResponse.json(
        {
          error:
            "Report limit reached. Please try again later.",
        },
        { status: 429 }
      );
    }

    /*
     * OpenAI embeddings are intentionally disabled.
     *
     * Stance does not require an OpenAI API key to submit reports.
     * The duplicate-detection function receives null and can use
     * its fallback matching logic.
     */
    const embeddingJson: string | null = null;

    // Check for similar/duplicate issues.
    const {
      data: similarIssues,
      error: duplicateError,
    } = await supabase.rpc("find_similar_issues", {
      p_title: title,
      p_zip_code: zipCode,
      p_category: category,
      p_embedding: embeddingJson,
      p_threshold: 0.82,
      p_limit: 3,
    });

    if (duplicateError) {
      console.error(
        "Duplicate check failed:",
        duplicateError
      );

      return NextResponse.json(
        {
          error:
            "Duplicate check is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (similarIssues && similarIssues.length > 0) {
      return NextResponse.json(
        {
          error: "A similar report already exists.",
          duplicates: similarIssues,
        },
        { status: 409 }
      );
    }

    // Resolve council district using coordinates first.
    // Fall back to ZIP-code resolution.
    let districtId: string | null = null;

    if (lat !== null && lng !== null) {
      const {
        data: spatialDistrict,
        error: spatialError,
      } = await supabase.rpc(
        "resolve_district_for_point",
        {
          p_lat: lat,
          p_lng: lng,
        }
      );

      if (spatialError) {
        console.error(
          "Spatial district resolution failed:",
          spatialError
        );
      } else {
        districtId = spatialDistrict || null;
      }
    }

    if (!districtId) {
      const {
        data: zipDistrict,
        error: districtError,
      } = await supabase.rpc(
        "resolve_district_for_zip",
        {
          p_zip_code: zipCode,
        }
      );

      if (districtError) {
        throw districtError;
      }

      districtId = zipDistrict || null;
    }

    console.log("Resolved district:", districtId);

    // Insert the issue.
    const { data, error } = await supabase
      .from("issues")
      .insert({
        title,
        description,
        category,
        zip_code: zipCode,
        urgency: body.urgency || "Medium Baseline",
        resolution_proof_url:
          body.resolution_proof_url || null,
        lat,
        lng,
        status: "Submitted",
        reporter_id: user.id,
        district_id: districtId,
        description_embedding: embeddingJson,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { id: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Issue API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}