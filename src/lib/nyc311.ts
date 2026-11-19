// src/lib/nyc311.ts
export interface District311Stats {
  total30Days: number;
  topCategories: { complaint_type: string; count: number }[];
}

export async function getDistrict311Baseline(
  districtNumber: number
): Promise<District311Stats> {
  // NYC OpenData pads single-digit council districts as "01", "02", etc.
  const paddedDistrict = String(districtNumber).padStart(2, "0");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoDate = thirtyDaysAgo.toISOString().split(".")[0];

  const baseUrl = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
  const params = new URLSearchParams({
    $select: "complaint_type, count(unique_key) as total",
    $where: `council_district='${paddedDistrict}' AND created_date >= '${isoDate}'`,
    $group: "complaint_type",
    $order: "total DESC",
    $limit: "5",
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      next: { revalidate: 3600 }, // Refresh hourly
    });

    if (!res.ok) {
      return { total30Days: 0, topCategories: [] };
    }

    const rows: { complaint_type: string; total: string }[] = await res.json();

    const topCategories = rows.slice(0, 3).map((r) => ({
      complaint_type: r.complaint_type,
      count: Number(r.total),
    }));

    // Fetch total 30-day volume across all categories
    const totalParams = new URLSearchParams({
      $select: "count(unique_key) as total",
      $where: `council_district='${paddedDistrict}' AND created_date >= '${isoDate}'`,
    });

    const totalRes = await fetch(`${baseUrl}?${totalParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    const totalRows: { total: string }[] = totalRes.ok
      ? await totalRes.json()
      : [];

    return {
      total30Days: Number(totalRows[0]?.total ?? 0),
      topCategories,
    };
  } catch {
    return { total30Days: 0, topCategories: [] };
  }
}