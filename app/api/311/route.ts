import { NextResponse } from "next/server";
import { categorize311Request } from "@/src/utils/categorize311";

const NYC_311_ENDPOINT = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const MAX_RESULTS = 50;

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

function asNumber(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim() ?? "";

  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: "A valid five-digit ZIP code is required." },
      { status: 400 },
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const formattedDateTime = since.toISOString().split(".")[0]; 

  const query = new URLSearchParams({
    $select: "unique_key,created_date,closed_date,complaint_type,descriptor,status,incident_zip,incident_address,borough,agency,latitude,longitude",
    $where: `incident_zip = '${zip}' AND created_date >= '${formattedDateTime}' AND lower(status) NOT LIKE '%closed%'`,
    $order: "created_date DESC",
    $limit: String(MAX_RESULTS),
  });

  try {
    const upstreamUrl = `${NYC_311_ENDPOINT}?${query}`;
    
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        ...(process.env.NYC_OPEN_DATA_APP_TOKEN
          ? { "X-App-Token": process.env.NYC_OPEN_DATA_APP_TOKEN.trim() }
          : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`🚨 NYC 311 upstream error [${upstream.status}]:`, errorText);
      return NextResponse.json(
        { error: "NYC 311 is temporarily unavailable.", details: errorText },
        { status: 502 },
      );
    }

    const rows: NYC311Row[] = await upstream.json();

    const requests: NYC311Request[] = rows.map((row: NYC311Row) => ({
      id: row.unique_key ?? crypto.randomUUID(),
      category: categorize311Request(row.complaint_type, row.agency),
      createdAt: row.created_date ?? null,
      closedAt: row.closed_date ?? null,
      complaintType: row.complaint_type ?? "311 request",
      descriptor: row.descriptor ?? null,
      status: row.status ?? "Open",
      zipCode: row.incident_zip ?? null,
      address: row.incident_address ?? null,
      borough: row.borough ?? null,
      agency: row.agency ?? null,
      latitude: asNumber(row.latitude),
      longitude: asNumber(row.longitude),
    }));

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error("🚨 NYC 311 request crashed:", error);
    return NextResponse.json(
      {
        error: "NYC 311 is temporarily unavailable.",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 502 },
    );
  }
}
