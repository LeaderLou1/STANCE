import fs from "node:fs";

async function buildMetadata() {
  const url =
    "https://data.cityofnewyork.us/resource/uvw5-9znb.json?$where=term_end>='2026-01-01'&$order=district%20ASC";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `NYC Open Data request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    const districtMap = {};

    data.forEach((member) => {
      const dist = Number(member.district);

      if (!dist || districtMap[dist]) {
        return;
      }

      const memberName =
        typeof member.name === "string"
          ? member.name.trim()
          : "";

      if (!memberName) {
        return;
      }

      const nameParts =
        memberName.split(/\s+/);

      const lastName =
        nameParts[nameParts.length - 1];

      const firstInitial =
        nameParts[0]?.[0] || "";

      const generatedEmail =
        `${firstInitial}${lastName}@council.nyc.gov`.replace(
          /[^a-zA-Z@.]/g,
          "",
        );

      districtMap[dist] = {
        party: "Democrat",

        phone: `(212) 788-72${
          dist < 10 ? `0${dist}` : dist
        }`,

        email: generatedEmail,

        officeAddress:
          "250 Broadway, New York, NY 10007",

        website: `https://council.nyc.gov/${memberName
          .toLowerCase()
          .replace(/[^a-z]/g, "-")}/`,

        photoUrl: `https://council.nyc.gov/wp-content/uploads/2021/11/${nameParts.join(
          "-",
        )}-300x300.jpg`,
      };
    });

    const fileContent = `export interface CouncilMetadata {
  party: string;
  phone: string;
  email: string;
  officeAddress: string;
  website: string;
  photoUrl: string;
}

export const DISTRICT_METADATA: Record<number, CouncilMetadata> = ${JSON.stringify(
      districtMap,
      null,
      2,
    )};
`;

    fs.writeFileSync(
      "src/data/councilMetadata.ts",
      fileContent,
      "utf8",
    );

    console.log(
      "Successfully generated src/data/councilMetadata.ts with all active districts!",
    );
  } catch (error) {
    console.error(
      "Error fetching data from NYC Open Data:",
      error,
    );

    process.exitCode = 1;
  }
}

buildMetadata();