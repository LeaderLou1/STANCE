import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseNumber = searchParams.get("houseNumber");
  const street = searchParams.get("street");
  const borough = searchParams.get("borough");

  if (!houseNumber || !street || !borough) {
    return NextResponse.json(
      { error: "Missing address fields" },
      { status: 400 }
    );
  }

  const apiKey = process.env.NYC_API_SUBSCRIPTION_KEY;

  const url = `https://api.nyc.gov/geoclient/v2/address?houseNumber=${encodeURIComponent(
    houseNumber
  )}&street=${encodeURIComponent(street)}&borough=${encodeURIComponent(
    borough
  )}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey || "",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Geoclient lookup failed");
    }

    const data = await response.json();
    const district = data.address?.cityCouncilDistrict;

    return NextResponse.json({ district });
  } catch (error) {
    console.error("District lookup failed:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}