"use client";

import { useCallback, useEffect, useState } from "react";
import DistrictOfficialCard from "./DistrictOfficialCard";
import { CouncilOfficial } from "@/src/types";

export interface Incident {
  id: string;
  category: string;
  complaintType: string;
  descriptor: string | null;
  status: string | null;
  address: string | null;
  agency?: string | null;
  createdAt: string | null;
  unique_key?: string;
  council_district?: number | null;
  latitude?: number;
  longitude?: number;
}

interface DistrictFeedProps {
  defaultZip: string;
  onSelectIncident?: (incident: Incident) => void;
}

interface CouncilMemberResponse {
  official?: CouncilOfficial | null;
}

interface District311Response {
  requests?: Incident[];
}

export default function DistrictFeed({
  defaultZip,
  onSelectIncident,
}: DistrictFeedProps) {
  const [zip, setZip] = useState(defaultZip);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [official, setOfficial] = useState<CouncilOfficial | null>(null);

  const fetchDistrictData = useCallback(async (targetZip: string) => {
    const normalizedZip = targetZip.trim();

    if (!/^\d{5}$/.test(normalizedZip)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch NYC 311 incidents for this ZIP.
      const res311 = await fetch(
        `/api/311?zip=${encodeURIComponent(normalizedZip)}`
      );

      if (!res311.ok) {
        throw new Error("Failed to load district data");
      }

      const json311: District311Response = await res311.json();
      const fetchedIncidents = json311.requests ?? [];

      setIncidents(fetchedIncidents);

      // 2. Resolve council district from spatial metadata.
      const itemWithDistrict = fetchedIncidents.find(
        (incident) =>
          incident.council_district !== undefined &&
          incident.council_district !== null
      );

      const resolvedDistrict =
        itemWithDistrict?.council_district != null
          ? Number(itemWithDistrict.council_district)
          : null;

      // 3. Fetch the council official.
      if (resolvedDistrict !== null && Number.isFinite(resolvedDistrict)) {
        const resOfficial = await fetch(
          `/api/councilmembers?district=${encodeURIComponent(
            resolvedDistrict
          )}`
        );

        if (resOfficial.ok) {
          const jsonOfficial: CouncilMemberResponse =
            await resOfficial.json();

          setOfficial(jsonOfficial.official ?? null);
        } else {
          setOfficial(null);
        }
      } else {
        setOfficial(null);
      }
    } catch {
      setError("Could not fetch recent data. Try again later.");
      setIncidents([]);
      setOfficial(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * defaultZip is already used as the initial state.
   *
   * The timeout prevents the React set-state-in-effect
   * lint rule from flagging setZip().
   */
  useEffect(() => {
    if (!defaultZip) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setZip(defaultZip);
      void fetchDistrictData(defaultZip);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [defaultZip, fetchDistrictData]);

  // Filter incidents by status.
  const filteredIncidents = incidents.filter((item) => {
    if (selectedStatus === "ALL") {
      return true;
    }

    return (
      item.status?.toUpperCase() === selectedStatus.toUpperCase()
    );
  });

  // Group incidents by category.
  const groupedRequests = filteredIncidents.reduce<
    Record<string, Incident[]>
  >((acc, incident) => {
    const categoryName =
      incident.category ||
      incident.complaintType ||
      "Other Issues";

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }

    acc[categoryName].push(incident);

    return acc;
  }, {});

  // Build available status filters.
  const availableStatuses = [
    "ALL",
    ...Array.from(
      new Set(
        incidents.map(
          (incident) => incident.status || "Open"
        )
      )
    ),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Council Official */}
      <DistrictOfficialCard
        official={official}
        zipCode={zip}
      />

      {/* District Feed */}
      <div className="rounded-xl border border-[#cbd5cc] bg-[#fffefa] p-6 shadow-md">
        <h2 className="mb-4 text-xl font-black tracking-[-0.03em] text-[#17211d]">
          Recent District 311 Activity
        </h2>

        {/* ZIP Search */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={zip}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, "")
                .slice(0, 5);

              setZip(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void fetchDistrictData(zip);
              }
            }}
            placeholder="Enter Zip Code"
            maxLength={5}
            inputMode="numeric"
            className="flex-1 rounded-lg border border-[#cbd5cc] bg-white px-4 py-2 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
          />

          <button
            type="button"
            onClick={() => void fetchDistrictData(zip)}
            disabled={loading || zip.length !== 5}
            className="rounded-lg bg-[#123b2a] px-5 py-2 text-sm font-bold text-white shadow-[0_2px_0_#081e15] transition hover:bg-[#1c563d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Status Filters */}
        {!loading &&
          !error &&
          incidents.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5 border-b border-[#cbd5cc] pb-3">
              {availableStatuses.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase transition ${
                    selectedStatus === status
                      ? "bg-[#123b2a] text-white shadow-sm"
                      : "bg-[#f3f1ec] text-[#647168] hover:bg-[#e8eee9]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}

        {/* Loading */}
        {loading && (
          <p className="py-4 text-center text-sm text-[#647168]">
            Scanning local reports...
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="py-4 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {/* No Results */}
        {!loading &&
          !error &&
          incidents.length === 0 && (
            <p className="py-4 text-center text-sm text-[#98a49b]">
              No recent issues found for this zip code.
            </p>
          )}

        {/* No Filter Results */}
        {!loading &&
          !error &&
          incidents.length > 0 &&
          filteredIncidents.length === 0 && (
            <p className="py-4 text-center text-sm text-[#98a49b]">
              No issues match the selected status filter.
            </p>
          )}

        {/* Categorized Incidents */}
        {!loading &&
          !error &&
          filteredIncidents.length > 0 && (
            <div className="max-h-[500px] space-y-6 overflow-y-auto pr-2">
              {Object.entries(groupedRequests).map(
                ([category, items]) => (
                  <div
                    key={category}
                    className="space-y-3 rounded-xl border border-[#cbd5cc] bg-white p-4 shadow-sm"
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between border-b border-[#cbd5cc] pb-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[#123b2a]">
                        {category}
                      </h3>

                      <span className="rounded-full bg-[#f3f1ec] px-2.5 py-0.5 text-[10px] font-bold text-[#647168]">
                        {items.length}{" "}
                        {items.length === 1
                          ? "issue"
                          : "issues"}
                      </span>
                    </div>

                    {/* Incident Cards */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item, index) => {
                        const clickable = Boolean(
                          onSelectIncident
                        );

                        return (
                          <div
                            key={
                              item.id ||
                              item.unique_key ||
                              `${category}-${index}`
                            }
                            onClick={() => {
                              onSelectIncident?.(item);
                            }}
                            onKeyDown={(event) => {
                              if (!clickable) {
                                return;
                              }

                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                onSelectIncident?.(item);
                              }
                            }}
                            role={
                              clickable
                                ? "button"
                                : undefined
                            }
                            tabIndex={
                              clickable ? 0 : undefined
                            }
                            className={`flex flex-col justify-between rounded-lg border border-[#e8eee9] bg-[#fffefa] p-3 transition ${
                              clickable
                                ? "cursor-pointer hover:border-[#2f7d5b] hover:bg-emerald-50/20"
                                : ""
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-1 text-xs font-bold text-[#17211d]">
                                  {item.complaintType}
                                </p>

                                <span className="shrink-0 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  {item.status || "Open"}
                                </span>
                              </div>

                              <p className="mt-1 line-clamp-1 text-[11px] text-[#647168]">
                                {item.descriptor ||
                                  "No additional details"}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-[#cbd5cc]/30 pt-2 text-[10px] font-medium text-[#98a49b]">
                              <span className="max-w-[140px] truncate">
                                🏢{" "}
                                {item.address ||
                                  "NYC Location"}
                              </span>

                              <span>
                                {item.agency || "NYC"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}