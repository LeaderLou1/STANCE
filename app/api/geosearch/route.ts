import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("text")?.trim();

  if (!query) {
    return NextResponse.json({ features: [] });
  }

  try {
    const url = new URL(
      "https://geosearch.planninglabs.nyc/v2/search"
    );

    url.searchParams.set("text", query);
    url.searchParams.set("size", "5");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();

      console.error(
        `NYC GeoSearch upstream returned ${res.status}:`,
        errorText
      );

      return NextResponse.json(
        { features: [] },
        { status: 200 }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "NYC GeoSearch upstream request failed:",
      error
    );

    return NextResponse.json(
      { features: [] },
      { status: 200 }
    );
  }
}