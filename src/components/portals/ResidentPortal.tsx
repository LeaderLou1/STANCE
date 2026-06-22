// src/components/portals/ResidentPortal.tsx
"use client";

import React, { useState } from "react"; // Added useState import
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
  issues: any[];
  initiatives?: any[]; // Added optional initiatives array to pass down later
  mapCenter: [number, number];
  stats: { total: number; inProgress: number; resolved: number; rate: number };
  handleUpvote: (id: string) => Promise<void>;
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Premium Public Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            Citizen Public Feed & Heatmaps
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore live infrastructure repairs, support active neighborhood
            concerns, and track resolution metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-100">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Direct Line to City Hall Enabled
        </div>
      </div>

      {/* 🛠️ Tab Switcher Section */}
      <div className="flex bg-slate-100 p-1 rounded-xl max-w-xs border border-slate-200">
        <button
          onClick={() => setActiveTab("issues")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "issues"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Neighborhood Fixes
        </button>
        <button
          onClick={() => setActiveTab("initiatives")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "initiatives"
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Community Collabs
        </button>
      </div>

      {/* Real-time Impact Metrics Block */}
      <StatsHeader stats={stats} />

      {/* Central Interactive Neighborhood Map Matrix */}
      <div className="w-full flex flex-col border border-slate-200 bg-white rounded-2xl p-5 shadow-sm">
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
