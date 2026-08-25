import { NextResponse } from "next/server";
import { DISTRICT_METADATA } from "@/src/data/councilMetadata";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const districtStr = searchParams.get("district");

  if (!districtStr) {
    return NextResponse.json({ error: "District parameter is required" }, { status: 400 });
  }

  const districtNum = Number(districtStr);

  try {
    // 1. Fetch live member name from NYC Open Data
    const query = `\$where=district=${districtNum}&\$order=term_end DESC&\$limit=1`;
    const res = await fetch(`https://data.cityofnewyork.us/resource/uvw5-9znb.json?${query}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) throw new Error("Failed to fetch from NYC Open Data");

    const data = await res.json();
    const liveMember = data[0] || {};

    // 2. Grab fallback metadata for this district
    const staticMeta = DISTRICT_METADATA[districtNum] || {
      party: "Democrat",
      phone: "(212) 788-7100",
      email: `District${districtNum}@council.nyc.gov`,
      officeAddress: "250 Broadway, New York, NY 10007",
      website: `https://council.nyc.gov/district-${districtNum}/`,
      photoUrl: "https://council.nyc.gov/wp-content/uploads/2021/11/default-profile.jpg",
    };

    // 3. Construct the merged payload
    const official = {
      district: districtNum,
      name: liveMember.name || `Council Member (District ${districtNum})`,
      ...staticMeta, // Overlays stable phone, email, address, and photo
    };

    return NextResponse.json({ official });
  } catch (err) {
    console.error("Error fetching council member:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}