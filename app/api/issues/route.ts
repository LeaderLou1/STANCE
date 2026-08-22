import { NextResponse } from "next/server";
import { createServerAdminClient, getBearerToken } from "@/src/lib/serverSupabase";

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
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const supabase = createServerAdminClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid authentication session." }, { status: 401 });
    }

    const body = (await request.json()) as ReportBody;
    const title = body.title?.trim() || "";
    const description = body.description?.trim() || "";
    const category = body.category?.trim() || "";
    const zipCode = body.zip_code?.trim() || "";

    if (title.length < 5 || title.length > 120) {
      return NextResponse.json({ error: "Title must be 5 to 120 characters." }, { status: 400 });
    }
    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json({ error: "Description must be 10 to 2,000 characters." }, { status: 400 });
    }
    if (!category || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: "Category and a valid ZIP code are required." }, { status: 400 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const userLimit = await supabase.rpc("consume_report_rate_limit", {
      p_bucket_key: `user:${user.id}`,
      p_limit: 10,
      p_window: "1 hour",
    });
    const ipLimit = await supabase.rpc("consume_report_rate_limit", {
      p_bucket_key: `ip:${ipAddress}`,
      p_limit: 20,
      p_window: "1 hour",
    });

    if (userLimit.error || ipLimit.error) {
      console.error("Rate-limit check failed:", userLimit.error || ipLimit.error);
      return NextResponse.json({ error: "Report protection is temporarily unavailable." }, { status: 503 });
    }
    if (!userLimit.data || !ipLimit.data) {
      return NextResponse.json({ error: "Report limit reached. Please try again later." }, { status: 429 });
    }

    const { data: similarIssues, error: duplicateError } = await supabase.rpc(
      "find_similar_issues",
      { p_title: title, p_zip_code: zipCode, p_category: category },
    );
    if (duplicateError) {
      console.error("Duplicate check failed:", duplicateError);
      return NextResponse.json({ error: "Duplicate check is temporarily unavailable." }, { status: 503 });
    }
    if (similarIssues && similarIssues.length > 0) {
      return NextResponse.json(
        { error: "A similar report already exists.", duplicates: similarIssues },
        { status: 409 },
      );
    }

    const { data: districtId, error: districtError } = await supabase.rpc(
      "resolve_district_for_zip",
      { p_zip_code: zipCode },
    );
    if (districtError) throw districtError;

    const { data, error } = await supabase
      .from("issues")
      .insert({
        title,
        description,
        category,
        zip_code: zipCode,
        urgency: body.urgency,
        resolution_proof_url: body.resolution_proof_url || null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        status: "Submitted",
        reporter_id: user.id,
        district_id: districtId || null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Issue API error:", error);
    return NextResponse.json({ error: "Unable to submit report." }, { status: 500 });
  }
}
