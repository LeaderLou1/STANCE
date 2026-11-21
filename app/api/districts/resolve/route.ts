
import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NYC_BOUNDS = {
  minLat: 40.4,
  maxLat: 41.0,
  minLng: -74.3,
  maxLng: -73.6,
};

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");

  if (!rawLat || !rawLng) {
    return jsonResponse(
      { error: "Latitude and longitude are required." },
      400,
    );
  }

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < NYC_BOUNDS.minLat ||
    lat > NYC_BOUNDS.maxLat ||
    lng < NYC_BOUNDS.minLng ||
    lng > NYC_BOUNDS.maxLng
  ) {
    return jsonResponse(
      { error: "Valid NYC coordinates are required." },
      400,
    );
  }

  try {
    const supabase = createServerAdminClient();

    const { data: districtId, error: resolveError } =
      await supabase.rpc("resolve_district_for_point", {
        p_lat: lat,
        p_lng: lng,
      });

    if (resolveError) {
      console.error("District RPC failed:", resolveError);
      return jsonResponse(
        { error: "Unable to resolve the Council District." },
        503,
      );
    }

    if (!districtId) {
      return jsonResponse({
        district: null,
        districtId: null,
        districtName: null,
        districtNumber: null,
      });
    }

    const { data: district, error: districtError } =
      await supabase
        .from("districts")
        .select("id, name, jurisdiction")
        .eq("id", districtId)
        .eq("jurisdiction", "New York City")
        .maybeSingle();

    if (districtError) {
      console.error("District lookup failed:", districtError);
      return jsonResponse(
        { error: "Unable to retrieve the Council District." },
        503,
      );
    }

    if (!district) {
      return jsonResponse(
        { error: "Resolved district record could not be found." },
        503,
      );
    }

    const match = district.name.match(
      /^Council District ([1-9]|[1-4]\d|5[01])$/,
    );

    if (!match) {
      console.error("Invalid district name:", district.name);
      return jsonResponse(
        { error: "Resolved district has invalid configuration." },
        503,
      );
    }

    const districtNumber = Number(match[1]);

    return jsonResponse({
      district: {
        id: district.id,
        name: district.name,
        number: districtNumber,
      },
      districtId: district.id,
      districtName: district.name,
      districtNumber,
    });
  } catch (error) {
    console.error("District resolution failed:", error);

    return jsonResponse(
      { error: "Unable to resolve the Council District." },
      503,
    );
  }
}
