const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Replace these with your actual keys from Supabase Project Settings -> API
const SUPABASE_URL = "https://kkfogdpylggtwlyddmnk.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm9nZHB5bGdndHdseWRkbW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Mzc1NzIsImV4cCI6MjA5NzIxMzU3Mn0.EYdVYHOXQ69QK22V7W0BIjQdng6MK2UVh0ypM1iylro"; // Use Service Role to bypass RLS policies

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importData() {
  // 1. Read your downloaded JSON file (make sure path matches where you saved it)
  const rawData = fs.readFileSync("./downloaded_file.json", "utf8");
  const jsonData = JSON.parse(rawData);

  // Note: If NYC Open Data gave you a GeoJSON structure, it wraps rows in a "features" array
  const rows = jsonData.features || jsonData;

  console.log(`Processing ${rows.length} ZIP boundary records...`);

  const payload = rows
    .map((item) => {
      // This safely extracts values whether it's raw JSON or a GeoJSON layout
      const properties = item.properties || item;
      const geometry = item.geometry || null;

      return {
        zip_code:
          properties.postalCode || properties.zipcode || properties.zip_code,
        // If file has explicit lat/lng properties, use them; otherwise, default to map centers
        lat: parseFloat(
          properties.latitude ||
            properties.lat ||
            (geometry ? geometry.coordinates[1] : 0),
        ),
        lng: parseFloat(
          properties.longitude ||
            properties.lng ||
            (geometry ? geometry.coordinates[0] : 0),
        ),
      };
    })
    .filter((row) => row.zip_code && row.lat && row.lng);

  // 2. Bulk upsert everything directly into your live Supabase table
  const { error } = await supabase
    .from("zip_boundaries")
    .upsert(payload, { onConflict: "zip_code" });

  if (error) {
    console.error("Error importing data:", error);
  } else {
    console.log("🎉 Successfully brought all ZIP boundaries into Supabase!");
  }
}

importData();
