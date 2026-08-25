import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.",
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

async function importData() {
  // Read downloaded JSON file.
  const rawData = fs.readFileSync(
    "./downloaded_file.json",
    "utf8",
  );

  const jsonData = JSON.parse(rawData);

  // NYC Open Data GeoJSON uses a features array.
  const rows = jsonData.features || jsonData;

  console.log(
    `Processing ${rows.length} ZIP boundary records...`,
  );

  const payload = rows
    .map((item) => {
      const properties =
        item.properties || item;

      const geometry =
        item.geometry || null;

      const coordinates =
        geometry?.coordinates;

      return {
        zip_code:
          properties.postalCode ||
          properties.zipcode ||
          properties.zip_code,

        lat: parseFloat(
          properties.latitude ||
            properties.lat ||
            (Array.isArray(coordinates)
              ? coordinates[1]
              : 0),
        ),

        lng: parseFloat(
          properties.longitude ||
            properties.lng ||
            (Array.isArray(coordinates)
              ? coordinates[0]
              : 0),
        ),
      };
    })
    .filter(
      (row) =>
        row.zip_code &&
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lng),
    );

  if (payload.length === 0) {
    throw new Error(
      "No valid ZIP boundary records were found in downloaded_file.json.",
    );
  }

  console.log(
    `Upserting ${payload.length} valid ZIP records...`,
  );

  const { error } = await supabase
    .from("zip_boundaries")
    .upsert(payload, {
      onConflict: "zip_code",
    });

  if (error) {
    console.error(
      "Error importing data:",
      error,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "🎉 Successfully imported ZIP boundaries into Supabase!",
  );
}

importData().catch((error) => {
  console.error(
    "Unexpected import failure:",
    error,
  );

  process.exitCode = 1;
});