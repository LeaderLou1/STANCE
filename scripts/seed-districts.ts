import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
);

async function seedDistrictsFromLink() {
  try {
    const endpoint =
      "https://data.cityofnewyork.us/resource/mkqi-d8x3.geojson";

    console.log(
      `Fetching official NYC district data from: ${endpoint}`,
    );

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch dataset: ${response.status} ${response.statusText}`,
      );
    }

    const geojson = await response.json();

    if (
      geojson.type !== "FeatureCollection" ||
      !Array.isArray(geojson.features)
    ) {
      throw new Error(
        "NYC endpoint did not return a GeoJSON FeatureCollection.",
      );
    }

    console.log(
      `Processing ${geojson.features.length} features from official endpoint...`,
    );

    for (const feature of geojson.features) {
      const props = feature.properties ?? {};

      const districtNum =
        props.coundist ??
        props.coun_dist ??
        props.CounDist;

      if (!districtNum) {
        console.warn(
          "Skipping feature without district identifier:",
          props,
        );
        continue;
      }

      if (
        !feature.geometry ||
        (feature.geometry.type !== "MultiPolygon" &&
          feature.geometry.type !== "Polygon")
      ) {
        console.warn(
          `Skipping District ${districtNum}: expected Polygon or MultiPolygon geometry.`,
        );
        continue;
      }

      const districtName = `Council District ${districtNum}`;
      const geometryString = JSON.stringify(
        feature.geometry,
      );

      const { error } = await supabase.rpc(
        "insert_district_geojson",
        {
          p_name: districtName,
          p_jurisdiction: "New York City",
          p_geojson: geometryString,
        },
      );

      if (error) {
        console.error(
          `Error inserting ${districtName}:`,
          error.message,
        );
      } else {
        console.log(
          `Successfully inserted: ${districtName}`,
        );
      }
    }

    console.log("\nDistrict seeding complete!");
  } catch (err: unknown) {
    console.error(
      "Failed to seed districts:",
      err instanceof Error ? err.message : err,
    );

    process.exit(1);
  }
}

void seedDistrictsFromLink();