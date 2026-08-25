import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeoclient() {
  const apiKey = process.env.NYC_API_SUBSCRIPTION_KEY;

  if (!apiKey) {
    console.error("❌ Error: NYC_API_SUBSCRIPTION_KEY is missing from .env.local");
    return;
  }

  // Example address: 250 Broadway, Manhattan
  const houseNumber = "250";
  const street = "Broadway";
  const borough = "Manhattan";

  const url = `https://api.nyc.gov/geoclient/v2/address?houseNumber=${houseNumber}&street=${encodeURIComponent(street)}&borough=${encodeURIComponent(borough)}`;

  console.log("Testing Geoclient API request...");

  try {
    const response = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const district = data.address?.cityCouncilDistrict;

    console.log("✅ Success!");
    console.log(`Address: ${houseNumber} ${street}, ${borough}`);
    console.log(`Mapped NYC Council District: ${district}`);
  } catch (error) {
    console.error("❌ Failed to fetch from Geoclient:", error.message);
  }
}

testGeoclient();