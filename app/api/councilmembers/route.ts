import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const districtStr = searchParams.get("district");

  if (!districtStr) {
    return NextResponse.json({ error: "District parameter is required" }, { status: 400 });
  }

  const districtNum = Number(districtStr);
  if (!Number.isInteger(districtNum) || districtNum < 1 || districtNum > 51) {
    return NextResponse.json({ error: "District must be an integer from 1 to 51." }, { status: 400 });
  }

  try {
    const url = new URL("https://data.cityofnewyork.us/resource/uvw5-9znb.json");
    url.searchParams.set("$where", `district=${districtNum}`);
    url.searchParams.set("$order", "term_end DESC");
    url.searchParams.set("$limit", "1");
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) throw new Error("Failed to fetch from NYC Open Data");

    const data = await res.json();
    const liveMember = data[0] || {};
    if (typeof liveMember.name !== "string" || !liveMember.name.trim()) {
      return NextResponse.json(
        { error: "No current council member record is available for this district." },
        { status: 404 },
      );
    }

    const official = {
      district: districtNum,
      name: liveMember.name.trim(),
      term_start: typeof liveMember.term_start === "string" ? liveMember.term_start : null,
      term_end: typeof liveMember.term_end === "string" ? liveMember.term_end : null,
      officialDirectoryUrl: "https://council.nyc.gov/districts/",
    };

    return NextResponse.json({ official });
  } catch (err) {
    console.error("Error fetching council member:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}