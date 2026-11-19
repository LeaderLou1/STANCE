import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

interface DistrictRow {
  id: string;
  name: string;
  jurisdiction: string;
}

interface RepresentativeRow {
  name: string;
  district: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number: rawNumber } = await params;
  if (!/^(?:[1-9]|[1-4]\d|5[01])$/.test(rawNumber)) {
    return NextResponse.json(
      { error: "Council district must be a number from 1 to 51." },
      { status: 400 },
    );
  }

  const districtNumber = Number(rawNumber);

  try {
    const supabase = createServerAdminClient();
    const { data: districtData, error: districtError } = await supabase
      .from("districts")
      .select("id, name, jurisdiction")
      .eq("name", `Council District ${districtNumber}`)
      .eq("jurisdiction", "New York City")
      .maybeSingle();

    if (districtError) throw districtError;
    if (!districtData) {
      return NextResponse.json(
        { error: "This council district is not available." },
        { status: 404 },
      );
    }

    const district = districtData as DistrictRow;
    const [
      { data: representativeData, error: representativeError },
      { data: issues, error: issuesError },
      { count: totalReports, error: totalError },
      { count: inProgressReports, error: inProgressError },
      { count: resolvedReports, error: resolvedError },
    ] = await Promise.all([
      supabase
        .from("representatives")
        .select("name, district")
        .eq("district_id", district.id)
        .maybeSingle(),
      supabase
        .from("issues")
        .select("id, title, category, status, urgency, created_at, upvotes")
        .eq("district_id", district.id)
        .eq("moderation_status", "Approved")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("district_id", district.id)
        .eq("moderation_status", "Approved"),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("district_id", district.id)
        .eq("moderation_status", "Approved")
        .eq("status", "In Progress"),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("district_id", district.id)
        .eq("moderation_status", "Approved")
        .eq("status", "Resolved"),
    ]);

    if (representativeError) throw representativeError;
    if (issuesError) throw issuesError;
    if (totalError) throw totalError;
    if (inProgressError) throw inProgressError;
    if (resolvedError) throw resolvedError;

    return NextResponse.json(
      {
        district: {
          id: district.id,
          number: districtNumber,
          name: district.name,
        },
        representative: representativeData as RepresentativeRow | null,
        officialDirectoryUrl: `https://council.nyc.gov/district-${districtNumber}/`,
        stats: {
          total: totalReports ?? 0,
          inProgress: inProgressReports ?? 0,
          resolved: resolvedReports ?? 0,
        },
        issues: issues ?? [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`Could not load Council District ${districtNumber}:`, error);
    return NextResponse.json(
      { error: "District information is temporarily unavailable." },
      { status: 503 },
    );
  }
}
