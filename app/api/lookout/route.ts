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
  if (!apiKey) {
    console.error("Lookout API error: NYC_API_SUBSCRIPTION_KEY is missing from environment variables.");
  }

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
      signal: AbortSignal.timeout(8000), // Prevent long-hanging requests
    });

    if (!response.ok) {
      throw new Error(`Geoclient lookup failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Support both direct address property and nested results response wrapper
    const district = 
      data.address?.cityCouncilDistrict || 
      data.results?.[0]?.response?.cityCouncilDistrict;

    if (!district) {
      return NextResponse.json(
        { error: "Could not determine city council district for this address." },
        { status: 404 }
      );
    }

    return NextResponse.json({ district: Number(district) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown lookup error";
    console.error("District lookup failed:", errorMessage);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}