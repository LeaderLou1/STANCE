
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export const runtime = "nodejs";

interface ReportPayload {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  lat?: unknown;
  lng?: unknown;
  reporterEmail?: unknown;
  photoUrl?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidNYCCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 40.4 &&
    lat <= 41.0 &&
    lng >= -74.3 &&
    lng <= -73.6
  );
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDistrictNumber(name: string): number | null {
  const match = name.match(/^Council District (\d{1,2})$/i);

  if (!match) return null;

  const number = Number(match[1]);

  return Number.isInteger(number) && number >= 1 && number <= 51
    ? number
    : null;
}

export async function POST(request: Request) {
  try {
    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 }
      );
    }

    if (!isRecord(rawBody)) {
      return NextResponse.json(
        { error: "Invalid report payload." },
        { status: 400 }
      );
    }

    const body = rawBody as ReportPayload;

    if (
      typeof body.title !== "string" ||
      typeof body.description !== "string" ||
      typeof body.category !== "string" ||
      typeof body.reporterEmail !== "string" ||
      typeof body.lat !== "number" ||
      typeof body.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "One or more required fields have invalid types." },
        { status: 400 }
      );
    }

    const title = body.title.trim();
    const description = body.description.trim();
    const category = body.category.trim();
    const reporterEmail = body.reporterEmail.trim().toLowerCase();
    const { lat, lng } = body;

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

    if (category.length < 2 || category.length > 80) {
      return NextResponse.json(
        { error: "Category must be 2 to 80 characters." },
        { status: 400 }
      );
    }

    if (!isValidEmail(reporterEmail)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!isValidNYCCoordinates(lat, lng)) {
      return NextResponse.json(
        { error: "A valid NYC location coordinate is required." },
        { status: 400 }
      );
    }

    // Until the secure upload endpoint exists, reject photo references.
    if (
      body.photoUrl !== undefined &&
      body.photoUrl !== null &&
      body.photoUrl !== ""
    ) {
      return NextResponse.json(
        { error: "Photo uploads are not enabled yet." },
        { status: 400 }
      );
    }

    const supabase = createServerAdminClient();

    // Resolve the district from geographic boundaries, never ZIP code.
    const { data: districtId, error: districtLookupError } =
      await supabase.rpc("resolve_district_for_point", {
        p_lat: lat,
        p_lng: lng,
      });

    if (districtLookupError) {
      console.error(
        "District resolution failed:",
        districtLookupError.message
      );

      return NextResponse.json(
        { error: "Unable to determine the council district." },
        { status: 503 }
      );
    }

    if (typeof districtId !== "string") {
      return NextResponse.json(
        { error: "This location could not be matched to an NYC council district." },
        { status: 422 }
      );
    }

    const { data: district, error: districtError } = await supabase
      .from("districts")
      .select("id, name, jurisdiction")
      .eq("id", districtId)
      .eq("jurisdiction", "New York City")
      .single();

    if (districtError || !district) {
      console.error(
        "District verification failed:",
        districtError?.message
      );

      return NextResponse.json(
        { error: "Unable to verify the council district." },
        { status: 503 }
      );
    }

    const districtNumber = getDistrictNumber(district.name);

    if (districtNumber === null) {
      console.error("Unexpected district name:", district.name);

      return NextResponse.json(
        { error: "The matched district is not configured correctly." },
        { status: 503 }
      );
    }

    const statusToken = randomUUID();

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title,
        description,
        category,
        district_number: districtNumber,
        district_id: district.id,
        lat,
        lng,
        photo_url: null,
        reporter_email: reporterEmail,
        status: "Pending Review",
        moderation_status: "Pending Review",
        resident_approved_at: null,
        approved_content: null,
        status_token: statusToken,
      })
      .select("id, status, moderation_status, district_number, created_at")
      .single();

    if (reportError || !report) {
      console.error("Report creation failed:", reportError?.message);

      return NextResponse.json(
        { error: "Unable to save your report. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId: report.id,
        status: report.status,
        moderationStatus: report.moderation_status,
        districtNumber: report.district_number,
        createdAt: report.created_at,
        message:
          "Your report has been received by STANCE and is pending review. It has not been sent to an official.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Report creation failed:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Unable to submit your report. Please try again later." },
      { status: 500 }
    );
  }
}
