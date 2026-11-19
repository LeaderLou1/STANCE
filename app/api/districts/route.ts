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

export async function GET() {
  try {
    const supabase = createServerAdminClient();
    const [{ data: districts, error: districtError }, { data: representatives, error: representativeError }] =
      await Promise.all([
        supabase
          .from("districts")
          .select("id, name, jurisdiction")
          .eq("jurisdiction", "New York City")
          .order("name"),
        supabase
          .from("representatives")
          .select("district_id, name")
          .not("district_id", "is", null),
      ]);

    if (districtError) throw districtError;
    if (representativeError) throw representativeError;

    const representativeByDistrict = new Map(
      ((representatives ?? []) as RepresentativeRow[]).map((representative) => [
        representative.district_id,
        representative.name,
      ]),
    );

    const result = ((districts ?? []) as DistrictRow[])
      .map((district) => {
        const match = district.name.match(/^Council District ([1-9]\d?)$/);
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
      .sort((left, right) => left.number - right.number);

    return NextResponse.json(
      { districts: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load council district directory:", error);
    return NextResponse.json(
      { error: "Council districts are temporarily unavailable." },
      { status: 503 },
    );
  }
}
