import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < 40.4 || lat > 41 ||
    lng < -74.3 || lng > -73.6
  ) {
    return NextResponse.json(
      { error: "Valid NYC coordinates are required." },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerAdminClient();
    const { data: districtId, error: resolveError } = await supabase.rpc(
      "resolve_district_for_point",
      { p_lat: lat, p_lng: lng },
    );
    if (resolveError) throw resolveError;
    if (!districtId) {
      return NextResponse.json({ district: null }, { status: 200 });
    }

    const { data: district, error: districtError } = await supabase
      .from("districts")
      .select("id, name")
      .eq("id", districtId)
      .maybeSingle();
    if (districtError) throw districtError;

    return NextResponse.json({
      districtId: district?.id ?? null,
      districtName: district?.name ?? null,
    });
  } catch (error) {
    console.error("District resolution failed:", error);
    return NextResponse.json(
      { error: "Unable to resolve the Council District." },
      { status: 503 },
    );
  }
}
