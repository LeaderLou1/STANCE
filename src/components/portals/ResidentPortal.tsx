"use client";

import React, { useMemo, useState } from "react";
import { CivicIssue } from "@/src/types";
import { StatsHeader } from "@/src/components/StatsHeader";
import {
  Users,
  MapPin,
  Sparkles,
  Landmark,
  Building2,
} from "lucide-react";
import dynamic from "next/dynamic";

const MapLoadingSkeleton = () => (
  <div className="flex h-96 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 shadow-inner">
    <MapPin className="h-5 w-5 animate-bounce text-emerald-600/40" />
    <span className="text-xs font-semibold tracking-wide text-slate-400 animate-pulse">
      Assembling live NYC GIS grid...
    </span>
  </div>
);

const IncidentMap = dynamic(
  () => import("@/src/components/IncidentMap"),
  {
    ssr: false,
    loading: MapLoadingSkeleton,
  }
);

export interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category: string;
  zip_code: string;
  council_district?: number | null;
  community_board?: string | null;
  lat?: number | null;
  lng?: number | null;
  upvotes: number;
}

interface ResidentPortalProps {
  issues: CivicIssue[];
  initiatives?: CivicInitiative[];
  mapCenter: [number, number];
  stats: {
    total: number;
    inProgress: number;
    resolved: number;
    rate: number;
  };
  handleUpvote: (id: string) => Promise<void>;
}

export function ResidentPortal({
  issues,
  initiatives = [],
  mapCenter,
  stats,
  handleUpvote,
}: ResidentPortalProps) {
  const [activeTab, setActiveTab] = useState<
    "issues" | "initiatives"
  >("issues");

  const [selectedDistrict, setSelectedDistrict] =
    useState<string>("all");

  const mappedInitiatives = useMemo<CivicIssue[]>(
    () => {
      return initiatives.map((init) => ({
        id: init.id,
        title: init.title,
        description: init.description,
        category: init.category,
        zip_code: init.zip_code,
        council_district:
          init.council_district ?? null,
        community_board:
          init.community_board ?? null,
        status: "In Progress",
        upvotes: init.upvotes,
        created_at:
          new Date().toISOString(),
        reporter_id: "system",
        latitude:
          init.lat ?? undefined,
        longitude:
          init.lng ?? undefined,
        urgency: "Medium Baseline",
        representative_id: null,
      }));
    },
    [initiatives]
  );

  const availableDistricts = useMemo(() => {
    const districts = new Set<number>();

    issues.forEach((issue) => {
      if (
        issue.council_district
      ) {
        districts.add(
          issue.council_district
        );
      }
    });

    return Array.from(
      districts
    ).sort((a, b) => a - b);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const list =
      activeTab === "issues"
        ? issues
        : mappedInitiatives;

    if (
      selectedDistrict === "all"
    ) {
      return list;
    }

    return list.filter(
      (issue) =>
        String(
          issue.council_district
        ) === selectedDistrict
    );
  }, [
    activeTab,
    issues,
    mappedInitiatives,
    selectedDistrict,
  ]);

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <div className="flex flex-col items-start justify-between gap-6 border-b border-[#cbd5cc] pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7732d]">
            NYC Neighborhood Intelligence
          </p>

          <h2 className="flex items-center gap-2 text-3xl font-black tracking-[-0.05em] text-[#17211d] sm:text-4xl">
            <Users className="h-7 w-7 text-[#2f7d5b]" />
            Your Community, In High Definition.
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#647168]">
            Track issues resolved across NYC Council
            Districts and Community Boards in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 border border-[#a9c8b3] bg-[#e5f0e7] px-3 py-2 text-xs font-bold text-[#1e5b3d]">
          <Sparkles className="h-3.5 w-3.5 text-[#2f7d5b]" />
          Live PostGIS GIS Data
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 border-b border-[#cbd5cc] pb-4 sm:flex-row sm:items-center">
        <div className="flex max-w-xs border-b border-[#cbd5cc] sm:border-b-0">
          <button
            type="button"
            onClick={() =>
              setActiveTab("issues")
            }
            className={`flex-1 px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "issues"
                ? "border-b-2 border-[#123b2a] text-[#17211d]"
                : "text-[#647168] hover:text-[#17211d]"
            }`}
          >
            311 & Neighborhood Fixes
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("initiatives")
            }
            className={`flex-1 px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "initiatives"
                ? "border-b-2 border-[#123b2a] text-[#17211d]"
                : "text-[#647168] hover:text-[#17211d]"
            }`}
          >
            Council Projects
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[#2f7d5b]" />

          <select
            value={selectedDistrict}
            onChange={(event) =>
              setSelectedDistrict(
                event.target.value
              )
            }
            className="border border-[#cbd5cc] bg-[#fffefa] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2f7d5b]"
          >
            <option value="all">
              All NYC Council Districts
            </option>

            {availableDistricts.map(
              (district) => (
                <option
                  key={district}
                  value={String(
                    district
                  )}
                >
                  Council District{" "}
                  {district}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <StatsHeader stats={stats} />

      

      <div className="flex w-full flex-col border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />

              {activeTab === "issues"
                ? "Live PostGIS Point Layer"
                : "Active Council & CB Collabs"}
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Points automatically mapped to Community
              Boards (1–59) and Council Districts (1–51)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live Boundary Sync
          </div>
        </div>

        <IncidentMap
          issues={filteredIssues}
          centerCoordinates={mapCenter}
          onUpvote={handleUpvote}
        />
      </div>
    </div>
  );
}