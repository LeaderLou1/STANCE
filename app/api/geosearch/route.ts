import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("text");

  if (!query) {
    return NextResponse.json({ features: [] });
  }

  try {
    const res = await fetch(
      `https://geosearch.planninglabs.nyc/v1/search?text=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      console.error(`NYC geosearch upstream returned ${res.status}`);
      return NextResponse.json({ features: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("NYC geosearch upstream request failed:", err);
    return NextResponse.json({ features: [] });
  }
}