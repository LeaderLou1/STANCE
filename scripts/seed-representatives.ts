import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
);

type NYCMember = {
  name: string;
  council_member_id: string;
  term_start: string;
  term_end: string;
  district: string;
  office_id: string;
};

async function seedRepresentatives() {
  try {
    const endpoint =
      "https://data.cityofnewyork.us/resource/uvw5-9znb.json";

    console.log(`Fetching NYC council members from: ${endpoint}`);

    const response = await fetch(
      `${endpoint}?$limit=100`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch council members: ${response.status} ${response.statusText}`,
      );
    }

    const members =
      (await response.json()) as NYCMember[];

    console.log(
      `Received ${members.length} council member records.`,
    );

    for (const member of members) {
      const districtNumber = Number(member.district);

      if (!Number.isInteger(districtNumber)) {
        console.warn(
          `Skipping ${member.name}: invalid district "${member.district}"`,
        );
        continue;
      }

      const districtName =
        `Council District ${districtNumber}`;

      // Find the existing district by its canonical name.
      const { data: district, error: districtError } =
        await supabase
          .from("districts")
          .select("id, name")
          .eq("name", districtName)
          .maybeSingle();

      if (districtError) {
        throw new Error(
          `Failed to find ${districtName}: ${districtError.message}`,
        );
      }

      if (!district) {
        console.warn(
          `Skipping ${member.name}: ${districtName} does not exist in Supabase.`,
        );
        continue;
      }

      // Look for an existing representative linked to this district.
      const {
        data: existingRepresentative,
        error: existingError,
      } = await supabase
        .from("representatives")
        .select("id")
        .eq("district_id", district.id)
        .maybeSingle();

      if (existingError) {
        throw new Error(
          `Failed checking ${districtName}: ${existingError.message}`,
        );
      }

      const representativeData = {
        name: member.name,
        district: `NY-${districtNumber}`,
        district_id: district.id,
      };

      if (existingRepresentative) {
        const { error: updateError } = await supabase
          .from("representatives")
          .update(representativeData)
          .eq("id", existingRepresentative.id);

        if (updateError) {
          throw new Error(
            `Failed updating ${member.name}: ${updateError.message}`,
          );
        }

        console.log(
          `Updated: ${member.name} → ${districtName}`,
        );
      } else {
        const { error: insertError } = await supabase
          .from("representatives")
          .insert(representativeData);

        if (insertError) {
          throw new Error(
            `Failed inserting ${member.name}: ${insertError.message}`,
          );
        }

        console.log(
          `Inserted: ${member.name} → ${districtName}`,
        );
      }
    }

    console.log(
      "\nRepresentative seeding complete!",
    );
  } catch (error: unknown) {
    console.error(
      "\nFailed to seed representatives:",
      error instanceof Error ? error.message : error,
    );

    process.exit(1);
  }
}

void seedRepresentatives();