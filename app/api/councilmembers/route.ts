
import { NextResponse } from "next/server";

interface CouncilMemberRecord {
  name?: string;
  district?: string | number;
  council_member_id?: string;
  office_id?: string;
  term_start?: string;
  term_end?: string;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const districtStr = searchParams.get("district");

  if (!districtStr || !/^(?:[1-9]|[1-4]\d|5[01])$/.test(districtStr)) {
    return jsonResponse(
      { error: "District must be an integer from 1 to 51." },
      400,
    );
  }

  const districtNum = Number(districtStr);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const url = new URL(
      "https://data.cityofnewyork.us/resource/uvw5-9znb.json",
    );

    url.searchParams.set("$where", `district=${districtNum}`);
    url.searchParams.set("$order", "term_start DESC");
    url.searchParams.set("$limit", "100");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;

    try {
      response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`NYC Open Data returned ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected NYC Open Data response format.");
    }

    const records = data as CouncilMemberRecord[];

    const activeMembers = records.filter((member) => {
      if (
        typeof member.name !== "string" ||
        typeof member.term_start !== "string" ||
        typeof member.term_end !== "string"
      ) {
        return false;
      }

      return (
        member.term_start.slice(0, 10) <= today &&
        member.term_end.slice(0, 10) >= today
      );
    });

    if (activeMembers.length === 0) {
      return jsonResponse(
        {
          error: "No active council member record is available for this district.",
          district: districtNum,
        },
        404,
      );
    }

    if (activeMembers.length !== 1) {
      console.error("Ambiguous active council member records:", {
        district: districtNum,
        count: activeMembers.length,
      });

      return jsonResponse(
        {
          error: "Multiple active council member records require verification.",
        },
        503,
      );
    }

    const liveMember = activeMembers[0];

    return jsonResponse({
      official: {
        district: districtNum,
        name: liveMember.name!.trim(),
        councilMemberId: liveMember.council_member_id ?? null,
        officeId: liveMember.office_id ?? null,
        termStart: liveMember.term_start,
        termEnd: liveMember.term_end,
        officialDirectoryUrl:
          `https://council.nyc.gov/district-${districtNum}/`,
      },
      source: "NYC Open Data",
      sourceDataset: "uvw5-9znb",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching council member:", error);

    return jsonResponse(
      { error: "Council member information is temporarily unavailable." },
      503,
    );
  }
}
