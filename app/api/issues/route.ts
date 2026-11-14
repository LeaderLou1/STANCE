import { NextResponse } from "next/server";
import {
  createServerAdminClient,
  getBearerToken,
} from "@/src/lib/serverSupabase";

interface ReportBody {
  title?: string;
  description?: string;
  category?: string;
  zip_code?: string;
  urgency?: string;
  lat?: number | null;
  lng?: number | null;
  resolution_proof_url?: string | null;
}

interface NYC311Enrichment {
  count: number;
  openCount: number;
  categories: string[];
  agencies: string[];
  nearestDistanceMeters: number | null;
  lastReportedAt: string | null;
}

const NYC_311_ENDPOINT =
  "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

const SEARCH_RADIUS_METERS = 1000;
const MAX_311_RESULTS = 50;

const EMPTY_311_ENRICHMENT: NYC311Enrichment = {
  count: 0,
  openCount: 0,
  categories: [],
  agencies: [],
  nearestDistanceMeters: null,
  lastReportedAt: null,
};

function isValidNYCCoordinates(
  lat: number,
  lng: number
): boolean {
  return (
    lat >= 40.4 &&
    lat <= 41.0 &&
    lng >= -74.3 &&
    lng <= -73.6
  );
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadius = 6371000;

  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const deltaLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const deltaLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

async function enrichWith311(
  lat: number,
  lng: number
): Promise<NYC311Enrichment> {
  const since = new Date();

  since.setDate(since.getDate() - 30);

  const formattedDateTime =
    since.toISOString().split(".")[0];

  const query = new URLSearchParams({
    $select:
      "unique_key,created_date,complaint_type,status,agency,latitude,longitude",

    $where:
      `within_circle(location,${lat},${lng},${SEARCH_RADIUS_METERS}) ` +
      `AND created_date >= '${formattedDateTime}'`,

    $order: "created_date DESC",

    $limit: String(MAX_311_RESULTS),
  });

  try {
    const upstream = await fetch(
      `${NYC_311_ENDPOINT}?${query.toString()}`,
      {
        headers: {
          Accept: "application/json",

          ...(process.env.NYC_OPEN_DATA_APP_TOKEN
            ? {
                "X-App-Token":
                  process.env.NYC_OPEN_DATA_APP_TOKEN.trim(),
              }
            : {}),
        },

        cache: "no-store",
      }
    );

    if (!upstream.ok) {
      console.error(
        "311 enrichment failed:",
        upstream.status
      );

      return EMPTY_311_ENRICHMENT;
    }

    const rows = (await upstream.json()) as Array<{
      unique_key?: string;
      created_date?: string;
      complaint_type?: string;
      status?: string;
      agency?: string;
      latitude?: string;
      longitude?: string;
    }>;

    const categories = new Set<string>();
    const agencies = new Set<string>();

    let openCount = 0;

    let nearestDistanceMeters:
      | number
      | null = null;

    let lastReportedAt:
      | string
      | null = null;

    for (const row of rows) {
      if (row.complaint_type) {
        categories.add(row.complaint_type);
      }

      if (row.agency) {
        agencies.add(row.agency);
      }

      if (
        row.status &&
        !row.status
          .toLowerCase()
          .includes("closed")
      ) {
        openCount++;
      }

      if (
        row.created_date &&
        (!lastReportedAt ||
          row.created_date > lastReportedAt)
      ) {
        lastReportedAt = row.created_date;
      }

      const rowLat = Number(row.latitude);
      const rowLng = Number(row.longitude);

      if (
        Number.isFinite(rowLat) &&
        Number.isFinite(rowLng)
      ) {
        const distance = distanceMeters(
          lat,
          lng,
          rowLat,
          rowLng
        );

        if (
          nearestDistanceMeters === null ||
          distance < nearestDistanceMeters
        ) {
          nearestDistanceMeters = distance;
        }
      }
    }

    return {
      count: rows.length,

      openCount,

      categories: Array.from(
        categories
      ).slice(0, 10),

      agencies: Array.from(
        agencies
      ).slice(0, 10),

      nearestDistanceMeters,

      lastReportedAt,
    };
  } catch (error) {
    console.error(
      "311 enrichment request failed:",
      error
    );

    return EMPTY_311_ENRICHMENT;
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
     * Authenticate request.
     */
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const supabase =
      createServerAdminClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Invalid authentication session.",
        },
        { status: 401 }
      );
    }

    /*
     * Parse request body.
     */
    const body =
      (await request.json()) as ReportBody;

    const title =
      body.title?.trim() || "";

    const description =
      body.description?.trim() || "";

    const category =
      body.category?.trim() || "";

    const zipCode =
      body.zip_code?.trim() || "";

    /*
     * Validate title.
     */
    if (
      title.length < 5 ||
      title.length > 120
    ) {
      return NextResponse.json(
        {
          error:
            "Title must be 5 to 120 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate description.
     */
    if (
      description.length < 10 ||
      description.length > 2000
    ) {
      return NextResponse.json(
        {
          error:
            "Description must be 10 to 2,000 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate category.
     */
    if (!category) {
      return NextResponse.json(
        {
          error:
            "Category is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Coordinates are the primary
     * geographic identifier.
     */
    let lat: number | null = null;
    let lng: number | null = null;

    if (
      typeof body.lat === "number" &&
      typeof body.lng === "number"
    ) {
      if (
        !isValidNYCCoordinates(
          body.lat,
          body.lng
        )
      ) {
        return NextResponse.json(
          {
            error:
              "The report location must be within NYC.",
          },
          { status: 400 }
        );
      }

      lat = body.lat;
      lng = body.lng;
    }

    /*
     * Basic rate limiting.
     */
    const forwardedFor =
      request.headers.get(
        "x-forwarded-for"
      );

    const ipAddress =
      forwardedFor
        ?.split(",")[0]
        ?.trim() || "unknown";

    const userLimit =
      await supabase.rpc(
        "consume_report_rate_limit",
        {
          p_bucket_key:
            `user:${user.id}`,

          p_limit: 10,

          p_window: "1 hour",
        }
      );

    const ipLimit =
      await supabase.rpc(
        "consume_report_rate_limit",
        {
          p_bucket_key:
            `ip:${ipAddress}`,

          p_limit: 20,

          p_window: "1 hour",
        }
      );

    if (
      userLimit.error ||
      ipLimit.error
    ) {
      console.error(
        "Rate-limit check failed:",
        userLimit.error ||
          ipLimit.error
      );

      return NextResponse.json(
        {
          error:
            "Report protection is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (
      !userLimit.data ||
      !ipLimit.data
    ) {
      return NextResponse.json(
        {
          error:
            "Report limit reached. Please try again later.",
        },
        { status: 429 }
      );
    }

    /*
     * Duplicate detection.
     */
    const {
      data: similarIssues,
      error: duplicateError,
    } =
      await supabase.rpc(
        "find_similar_issues_v2",
        {
          p_title: title,
          p_zip_code: zipCode || null,
          p_category: category,
          p_limit: 3,
        }
      );

    if (duplicateError) {
      console.error(
        "Duplicate check failed:",
        duplicateError
      );

      return NextResponse.json(
        {
          error:
            "Duplicate check is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (
      similarIssues &&
      similarIssues.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "A similar report already exists.",

          duplicates:
            similarIssues,
        },
        { status: 409 }
      );
    }

    /*
     * Resolve council district
     * using coordinates first.
     */
    let districtId:
      | string
      | null = null;

    if (
      lat !== null &&
      lng !== null
    ) {
      const {
        data: spatialDistrict,
        error: spatialError,
      } =
        await supabase.rpc(
          "resolve_district_for_point",
          {
            p_lat: lat,
            p_lng: lng,
          }
        );

      if (spatialError) {
        console.error(
          "Spatial district resolution failed:",
          spatialError
        );
      } else {
        districtId =
          spatialDistrict || null;
      }
    }

    /*
     * ZIP is only a fallback
     * for district resolution.
     */
    if (
      !districtId &&
      zipCode
    ) {
      const {
        data: zipDistrict,
        error: districtError,
      } =
        await supabase.rpc(
          "resolve_district_for_zip",
          {
            p_zip_code: zipCode,
          }
        );

      if (districtError) {
        console.error(
          "ZIP district resolution failed:",
          districtError
        );
      } else {
        districtId =
          zipDistrict || null;
      }
    }

    /*
     * 311 geographic enrichment.
     *
     * This stays server-side.
     * The user never directly interacts
     * with the 311 API.
     */
    let nearby311 =
      EMPTY_311_ENRICHMENT;

    if (
      lat !== null &&
      lng !== null
    ) {
      nearby311 =
        await enrichWith311(
          lat,
          lng
        );
    }

    /*
     * Store civic intelligence as JSONB.
     */
    const civicContext = {
      version: 1,

      generatedAt:
        new Date().toISOString(),

      geography: {
        latitude: lat,

        longitude: lng,

        districtId,

        zipCode:
          zipCode || null,
      },

      "311": {
        nearbyCount:
          nearby311.count,

        openCount:
          nearby311.openCount,

        categories:
          nearby311.categories,

        agencies:
          nearby311.agencies,

        nearestDistanceMeters:
          nearby311.nearestDistanceMeters,

        lastReportedAt:
          nearby311.lastReportedAt,

        searchRadiusMeters:
          SEARCH_RADIUS_METERS,

        lookbackDays: 30,
      },
    };

    /*
     * TEMPORARY DEBUG LOG.
     *
     * This proves the new submission route
     * generated civic_context before insertion.
     */
    /*
     * Insert the issue.
     */
    const {
      data,
      error,
    } =
      await supabase
        .from("issues")
        .insert({
          title,

          description,

          category,

          zip_code:
            zipCode || null,

          urgency:
            body.urgency ||
            "Medium Baseline",

          resolution_proof_url:
            body.resolution_proof_url ||
            null,

          lat,

          lng,

          status: "Submitted",

          reporter_id:
            user.id,

          district_id:
            districtId,

          civic_context:
            civicContext,
        })
        .select("id")
        .single();

    if (error) {
      throw error;
    }

    /*
     * Return created issue ID.
     */
    return NextResponse.json(
      {
        id: data.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Issue API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to submit report. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}