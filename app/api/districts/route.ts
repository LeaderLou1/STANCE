
import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

interface DistrictRow {
  id: string;
  name: string;
  jurisdiction: string;
}

interface RepresentativeRow {
  district_id: string | null;
  name: string;
}

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

export async function GET() {
  try {
    const supabase = createServerAdminClient();

    const [
      { data: districts, error: districtError },
      { data: representatives, error: representativeError },
    ] = await Promise.all([
      supabase
        .from("districts")
        .select("id, name, jurisdiction")
        .eq("jurisdiction", "New York City"),
      supabase
        .from("representatives")
        .select("district_id, name")
        .not("district_id", "is", null),
    ]);

    if (districtError) throw districtError;
    if (representativeError) throw representativeError;

    const representativeByDistrict = new Map<string, string>();

    for (const representative of (representatives ?? []) as RepresentativeRow[]) {
      if (!representative.district_id) continue;

      if (representativeByDistrict.has(representative.district_id)) {
        console.error(
          "Multiple representatives mapped to district:",
          representative.district_id,
        );

        return jsonResponse(
          { error: "Representative directory contains duplicate district assignments." },
          503,
        );
      }

      representativeByDistrict.set(
        representative.district_id,
        representative.name,
      );
    }

    const result = ((districts ?? []) as DistrictRow[])
      .map((district) => {
        const match = district.name.match(
          /^Council District ([1-9]|[1-4]\d|5[01])$/,
        );

        if (!match) return null;

        return {
          id: district.id,
          number: Number(match[1]),
          name: district.name,
          representativeName:
            representativeByDistrict.get(district.id) ?? null,
        };
      })
      .filter((district) => district !== null)
      .sort((a, b) => a.number - b.number);

    const districtNumbers = new Set(result.map((district) => district.number));

    if (
      result.length !== 51 ||
      districtNumbers.size !== 51 ||
      Array.from({ length: 51 }, (_, index) => index + 1)
        .some((number) => !districtNumbers.has(number))
    ) {
      console.error("NYC district directory is incomplete:", {
        districtCount: result.length,
        uniqueDistrictCount: districtNumbers.size,
      });

      return jsonResponse(
        { error: "Council district directory is incomplete." },
        503,
      );
    }

    return jsonResponse({ districts: result });
  } catch (error) {
    console.error("Could not load council district directory:", error);

    return jsonResponse(
      { error: "Council districts are temporarily unavailable." },
      503,
    );
  }
}
