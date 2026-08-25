export interface CouncilOfficial {
  district: number;
  name: string;
  party: string;
  phone: string;
  email: string;
  officeAddress: string;
  website: string;
  photoUrl: string;
}

// Sample mapping for demonstration (expandable to all 51 districts or fetched via NYC Open Data API)
export const COUNCIL_OFFICIALS: Record<number, CouncilOfficial> = {
  33: {
    district: 33,
    name: "Lincoln Restler",
    party: "Democrat",
    phone: "(212) 788-7210",
    email: "District33@council.nyc.gov",
    officeAddress: "250 Broadway, Suite 1835, New York, NY 10007",
    website: "https://council.nyc.gov/lincoln-restler/",
    photoUrl: "https://council.nyc.gov/wp-content/uploads/2021/11/Lincoln-Restler-300x300.jpg",
  },
  // Add additional districts here...
};

// Helper mapper mapping common ZIP codes to Council Districts
export const ZIP_TO_DISTRICT: Record<string, number> = {
  "11201": 33,
  "11211": 33,
  "11215": 39,
  "11217": 33,
  // Map more local ZIP codes...
};

export function getOfficialByZip(zip: string): CouncilOfficial | null {
  const districtNum = ZIP_TO_DISTRICT[zip];
  if (!districtNum) return null;
  return COUNCIL_OFFICIALS[districtNum] || null;
}