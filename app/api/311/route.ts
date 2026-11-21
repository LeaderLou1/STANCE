
import { NextResponse } from "next/server";
import { categorize311Request } from "@/src/utils/categorize311";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NYC_311_ENDPOINT =
  "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

const MAX_RESULTS = 50;
const SEARCH_RADIUS_METERS = 1000;
const REQUEST_TIMEOUT_MS = 8000;

const NYC_BOUNDS = {
  minLatitude: 40.4,
  maxLatitude: 41.0,
  minLongitude: -74.3,
  maxLongitude: -73.6,
};

interface NYC311Row {
  unique_key?: string;
  created_date?: string;
  closed_date?: string;
  complaint_type?: string;
  descriptor?: string;
  status?: string;
  incident_zip?: string;
  incident_address?: string;
  borough?: string;
  agency?: string;
  latitude?: string;
  longitude?: string;
}

export interface NYC311Request {
  id: string;
  category: string;
  createdAt: string | null;
  closedAt: string | null;
  complaintType: string;
  descriptor: string | null;
  status: string | null;
  zipCode: string | null;
  address: string | null;
  borough: string | null;
  agency: string | null;
  latitude: number | null;
  longitude: number | null;
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

function parseCoordinate(value: string | undefined): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isValidNYCCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= NYC_BOUNDS.minLatitude &&
    latitude <= NYC_BOUNDS.maxLatitude &&
    longitude >= NYC_BOUNDS.minLongitude &&
    longitude <= NYC_BOUNDS.maxLongitude
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const latitudeParam = searchParams.get("lat")?.trim() ?? "";
  const longitudeParam = searchParams.get("lng")?.trim() ?? "";

  if (!latitudeParam || !longitudeParam) {
    return jsonResponse(
      {
        error: "Latitude and longitude are required.",
      },
      400,
    );
  }

  const latitude = Number(latitudeParam);
  const longitude = Number(longitudeParam);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isValidNYCCoordinates(latitude, longitude)
  ) {
    return jsonResponse(
      {
        error:
          "Valid NYC latitude and longitude coordinates are required.",
      },
      400,
    );
  }

  // Retrieve requests created within the previous 30 days.
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const formattedDateTime = since
    .toISOString()
    .slice(0, 19);

  const query = new URLSearchParams({
    $select:
      "unique_key,created_date,closed_date,complaint_type,descriptor,status,incident_zip,incident_address,borough,agency,latitude,longitude",
    $where:
      `within_circle(location,${latitude},${longitude},${SEARCH_RADIUS_METERS}) ` +
      `AND created_date >= '${formattedDateTime}' ` +
      `AND lower(status) NOT LIKE '%closed%'`,
    $order: "created_date DESC",
    $limit: String(MAX_RESULTS),
  });

  try {
    const upstreamUrl =
      `${NYC_311_ENDPOINT}?${query.toString()}`;

    const appToken =
      process.env.NYC_OPEN_DATA_APP_TOKEN?.trim();

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(appToken
          ? { "X-App-Token": appToken }
          : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!upstream.ok) {
      console.error(
        `NYC 311 upstream returned HTTP ${upstream.status}.`,
      );

      return jsonResponse(
        {
          error: "NYC 311 is temporarily unavailable.",
        },
        502,
      );
    }

    const rows: unknown = await upstream.json();

    if (!Array.isArray(rows)) {
      console.error(
        "NYC 311 returned an unexpected response format.",
      );

      return jsonResponse(
        {
          error: "NYC 311 returned an invalid response.",
        },
        502,
      );
    }

    const validRows = (rows as NYC311Row[]).filter(
      (row) =>
        row &&
        typeof row.unique_key === "string" &&
        row.unique_key.trim().length > 0,
    );

    const requests: NYC311Request[] = validRows.map(
      (row) => ({
        id: row.unique_key!.trim(),
        category: categorize311Request(
          row.complaint_type,
          row.agency,
        ),
        createdAt: row.created_date ?? null,
        closedAt: row.closed_date ?? null,
        complaintType:
          row.complaint_type ?? "311 request",
        descriptor: row.descriptor ?? null,
        status: row.status ?? null,
        zipCode: row.incident_zip ?? null,
        address: row.incident_address ?? null,
        borough: row.borough ?? null,
        agency: row.agency ?? null,
        latitude: parseCoordinate(row.latitude),
        longitude: parseCoordinate(row.longitude),
      }),
    );

    return jsonResponse({
      requests,
      center: {
        latitude,
        longitude,
      },
      radiusMeters: SEARCH_RADIUS_METERS,
      windowDays: 30,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      console.error("NYC 311 request timed out.");

      return jsonResponse(
        {
          error: "NYC 311 is taking too long to respond.",
        },
        504,
      );
    }

    console.error("NYC 311 request failed:", error);

    return jsonResponse(
      {
        error: "NYC 311 is temporarily unavailable.",
      },
      502,
    );
  }
}
