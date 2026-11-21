
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GEOSEARCH_URL = "https://geosearch.planninglabs.nyc/v2/search";

const NYC_QUERY_MAX_LENGTH = 200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("text")?.trim() ?? "";

  const headers = {
    "Cache-Control": "no-store, max-age=0",
  };

  if (!query) {
    return NextResponse.json(
      { features: [] },
      { status: 200, headers }
    );
  }

  if (query.length > NYC_QUERY_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Search query is too long.", features: [] },
      { status: 400, headers }
    );
  }

  if (query.length < 3) {
    return NextResponse.json(
      { features: [] },
      { status: 200, headers }
    );
  }

  try {
    const url = new URL(GEOSEARCH_URL);

    url.searchParams.set("text", query);
    url.searchParams.set("size", "5");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(
        `NYC GeoSearch returned HTTP ${response.status}`
      );

      return NextResponse.json(
        { features: [] },
        { status: 200, headers }
      );
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !("features" in data) ||
      !Array.isArray(data.features)
    ) {
      console.error("NYC GeoSearch returned an unexpected response.");

      return NextResponse.json(
        { features: [] },
        { status: 502, headers }
      );
    }

    return NextResponse.json(
      { features: data.features },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error(
      "NYC GeoSearch request failed:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { features: [] },
      { status: 200, headers }
    );
  }
}
