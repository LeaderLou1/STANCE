import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

const ENDPOINT =
  "https://data.cityofnewyork.us/resource/mkqi-d8x3.geojson";

type GeoJSONGeometry = {
  type: string;
  coordinates: unknown;
};

type GeoJSONFeature = {
  type: string;
  geometry: GeoJSONGeometry | null;
  properties?: Record<string, unknown>;
};

type GeoJSONFeatureCollection = {
  type: string;
  features: GeoJSONFeature[];
};

function getDistrictNumber(
  properties: Record<string, unknown>
): string | null {
  const value =
    properties.coundist ??
    properties.coun_dist ??
    properties.CounDist ??
    properties.council_district ??
    properties.district;

  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim();
}

async function seedDistricts() {
  console.log("Fetching official NYC Council district boundaries...");
  console.log(ENDPOINT);

  const response = await fetch(ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `NYC dataset request failed: ${response.status} ${response.statusText}`
    );
  }

  const geojson =
    (await response.json()) as GeoJSONFeatureCollection;

  if (
    geojson.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    throw new Error(
      "NYC dataset did not return a valid FeatureCollection."
    );
  }

  console.log(
    `Received ${geojson.features.length} boundary features.`
  );

  if (geojson.features.length !== 51) {
    throw new Error(
      `Expected 51 districts, received ${geojson.features.length}.`
    );
  }

  let updated = 0;

  for (const feature of geojson.features) {
    const properties = feature.properties ?? {};
    const districtNumber = getDistrictNumber(properties);

    if (!districtNumber) {
      console.error(
        "✗ Feature is missing a district number:",
        properties
      );
      continue;
    }

    if (!feature.geometry) {
      console.error(
        `✗ Council District ${districtNumber}: missing geometry`
      );
      continue;
    }

    const geometryType = feature.geometry.type;

    if (
      geometryType !== "Polygon" &&
      geometryType !== "MultiPolygon"
    ) {
      console.error(
        `✗ Council District ${districtNumber}: unsupported geometry type ${geometryType}`
      );
      continue;
    }

    const districtName =
      `Council District ${districtNumber}`;

    try {
      const { data, error } = await supabase.rpc(
        "upsert_district_boundary",
        {
          p_name: districtName,
          p_jurisdiction: "New York City",
          p_geojson: feature.geometry,
        }
      );

      if (error) {
        console.error(
          `✗ ${districtName}:`,
          error.message
        );
        continue;
      }

      console.log(
        `✓ ${districtName} → ${data}`
      );

      updated++;
    } catch (error) {
      console.error(
        `✗ ${districtName}:`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  console.log("\n========================================");
  console.log("NYC DISTRICT BOUNDARY SEED COMPLETE");
  console.log("========================================");
  console.log(`Updated: ${updated}`);
  console.log(`Expected: 51`);
  console.log("========================================");

  if (updated !== 51) {
    throw new Error(
      `District seeding failed: expected 51, updated ${updated}.`
    );
  }
}

void seedDistricts().catch((error) => {
  console.error(
    "\nDistrict seeding failed:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});