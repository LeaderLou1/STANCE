export type NYC311Category =
  | "Housing & Buildings"
  | "Noise & Quality of Life"
  | "Sanitation & Trash"
  | "Streets, Sidewalks & Transit"
  | "Parking & Vehicles"
  | "Health, Pest & Environment"
  | "Parks & Trees"
  | "Social Services"
  | "General City Services";

export interface Standardized311Request {
  id: string;
  category: NYC311Category;
  complaintType: string;
  descriptor: string;
  status: string;
  address: string;
  zipCode: string;
  agency: string;
  createdAt: string;
  lat: number | null;
  lng: number | null;
}

export function categorize311Request(
  complaintType: string = "",
  agency: string = ""
): NYC311Category {
  const type = complaintType.toLowerCase();
  const ag = agency.toUpperCase();

  // 1. Housing & Buildings (HPD & DOB)
  if (
    ag === "HPD" ||
    ag === "DOB" ||
    type.includes("heat") ||
    type.includes("paint") ||
    type.includes("plumbing") ||
    type.includes("building") ||
    type.includes("elevator") ||
    type.includes("boiler")
  ) {
    return "Housing & Buildings";
  }

  // 2. Parking & Vehicles
  if (
    type.includes("parking") ||
    type.includes("blocked driveway") ||
    type.includes("derelict vehicle") ||
    type.includes("abandoned vehicle") ||
    type.includes("taxi") ||
    ag === "TLC"
  ) {
    return "Parking & Vehicles";
  }

  // 3. Noise & Quality of Life
  if (type.includes("noise")) {
    return "Noise & Quality of Life";
  }

  // 4. Sanitation & Trash (DSNY)
  if (
    ag === "DSNY" ||
    type.includes("sanitation") ||
    type.includes("dirty") ||
    type.includes("trash") ||
    type.includes("recycling") ||
    type.includes("dumping") ||
    type.includes("litter")
  ) {
    return "Sanitation & Trash";
  }

  // 5. Streets, Sidewalks & Transit (DOT)
  if (
    ag === "DOT" ||
    type.includes("pothole") ||
    type.includes("street condition") ||
    type.includes("street light") ||
    type.includes("traffic signal") ||
    type.includes("sidewalk") ||
    type.includes("sign")
  ) {
    return "Streets, Sidewalks & Transit";
  }

  // 6. Health, Pest & Environment (DOHMH & DEP)
  if (
    ag === "DOHMH" ||
    type.includes("rodent") ||
    type.includes("rat") ||
    type.includes("pest") ||
    type.includes("lead") ||
    type.includes("sewer") ||
    type.includes("water system") ||
    type.includes("air quality")
  ) {
    return "Health, Pest & Environment";
  }

  // 7. Parks & Trees (PARKS)
  if (ag === "PARKS" || type.includes("tree") || type.includes("park")) {
    return "Parks & Trees";
  }

  // 8. Social Services (DHS / HRA)
  if (
    ag === "DHS" ||
    ag === "HRA" ||
    type.includes("homeless") ||
    type.includes("encampment")
  ) {
    return "Social Services";
  }

  return "General City Services";
}