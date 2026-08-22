// src/components/portals/ResidentPortal.tsx
"use client";

import React, { useState } from "react"; // Added useState import
import { CivicIssue } from "@/src/types";
import { StatsHeader } from "@/src/components/StatsHeader";
import { Users, MapPin, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

const MapLoadingSkeleton = () => (
  <div className="w-full h-96 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
    <MapPin className="w-5 h-5 text-emerald-600/40 animate-bounce" />
    <span className="text-xs font-semibold tracking-wide text-slate-400 animate-pulse">
      Assembling live neighborhood grid...
    </span>
  </div>
);

const IncidentMap = dynamic(() => import("@/src/components/IncidentMap"), {
  ssr: false,
  loading: MapLoadingSkeleton,
});

interface ResidentPortalProps {
  issues: CivicIssue[];
  initiatives?: CivicInitiative[];
  mapCenter: [number, number];
  stats: { total: number; inProgress: number; resolved: number; rate: number };
  handleUpvote: (id: string) => Promise<void>;
}

interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category: string;
  zip_code: string;
  lat?: number | null;
  lng?: number | null;
  upvotes: number;
}

export function ResidentPortal({
  issues,
  initiatives = [], // Defaults to an empty array if not passed yet
  mapCenter,
  stats,
  handleUpvote,
}: ResidentPortalProps) {
  // ✅ Hooks must live INSIDE the function component
  const [activeTab, setActiveTab] = useState<"issues" | "initiatives">(
    "issues",
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Premium Public Banner */}
      <div className="flex flex-col items-start justify-between gap-6 border-b border-[#cbd5cc] pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7732d]">Civic pulse</p>
          <h2 className="flex items-center gap-2 text-3xl font-black tracking-[-0.05em] text-[#17211d] sm:text-4xl">
            <Users className="h-7 w-7 text-[#2f7d5b]" />
            Your neighborhood, in view.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#647168]">
            See what needs attention, add context to a report, and follow progress from submission to resolution.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-[#a9c8b3] bg-[#e5f0e7] px-3 py-2 text-xs font-bold text-[#1e5b3d]">
          <Sparkles className="h-3.5 w-3.5 text-[#2f7d5b]" />
          Live community data
        </div>
      </div>

      {/* 🛠️ Tab Switcher Section */}
      <div className="flex max-w-xs border-b border-[#cbd5cc]">
        <button
          onClick={() => setActiveTab("issues")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "issues"
              ? "border-b-2 border-[#123b2a] text-[#17211d]"
              : "text-[#647168] hover:text-[#17211d]"
          }`}
        >
          Neighborhood Fixes
        </button>
        <button
          onClick={() => setActiveTab("initiatives")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "initiatives"
              ? "border-b-2 border-[#123b2a] text-[#17211d]"
              : "text-[#647168] hover:text-[#17211d]"
          }`}
        >
          Community Collabs
        </button>
      </div>

      {/* Real-time Impact Metrics Block */}
      <StatsHeader stats={stats} />

      {/* Central Interactive Neighborhood Map Matrix */}
      <div className="flex w-full flex-col border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === "issues"
                ? "Live Neighborhood Grid"
                : "Active Community Initiatives"}
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === "issues"
                ? "Tap coordinates to support open community tickets"
                : "Explore citizen events and neighborhood collaborations"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Streaming Live Points
          </div>
        </div>

        {/* 🗺️ Dynamically pass the matching dataset based on selected tab */}
        <IncidentMap
          issues={activeTab === "issues" ? issues : initiatives}
          centerCoordinates={mapCenter}
          onUpvote={handleUpvote}
        />
      </div>
    </div>
  );
}
