import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const houseNumber = searchParams.get("houseNumber");
  const street = searchParams.get("street");
  const borough = searchParams.get("borough");

  if (!houseNumber || !street) {
    return NextResponse.json(
      { error: "Missing required address parameters" },
      { status: 400 },
    );
  }

  const apiKey = process.env.NYC_API_SUBSCRIPTION_KEY;
  if (!apiKey) {
    console.error("Geoclient lookup error: NYC_API_SUBSCRIPTION_KEY is missing from environment variables.");
  }

  const url =
    `https://api.nyc.gov/geoclient/v2/address` +
    `?houseNumber=${encodeURIComponent(houseNumber)}` +
    `&street=${encodeURIComponent(street)}` +
    `&borough=${encodeURIComponent(borough || "")}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey || "",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000), // Prevent hanging requests
    });

    if (!response.ok) {
      throw new Error(
        `Geoclient API failed with status ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    
    // Fallback path handling depending on Geoclient wrapper structure
    const district = 
      data.address?.cityCouncilDistrict || 
      data.results?.[0]?.response?.cityCouncilDistrict;

    if (!district) {
      return NextResponse.json(
        { error: "Could not resolve Council District for the provided address." },
        { status: 404 }
      );
    }

    return NextResponse.json({ district: Number(district) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown district resolution error";
    console.error("District lookup failure:", errorMessage);
    
    return NextResponse.json(
      { error: "Failed to resolve district" },
      { status: 500 },
    );
  }
}