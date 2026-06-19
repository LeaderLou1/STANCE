// src/components/portals/ResidentPortal.tsx
"use client";

import React from "react";
import { StatsHeader } from "@/src/components/StatsHeader";
import { Users, MapPin, Sparkles, MessageSquare } from "lucide-react";
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
  mapCenter: [number, number];
  stats: { total: number; inProgress: number; resolved: number; rate: number };
  handleUpvote: (id: string) => Promise<void>;
}

export function ResidentPortal({
  issues,
  mapCenter,
  stats,
  handleUpvote,
}: ResidentPortalProps) {
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

      {/* Real-time Impact Metrics Block */}
      <StatsHeader stats={stats} />

      {/* Central Interactive Neighborhood Map Matrix */}
      <div className="w-full flex flex-col border border-slate-200 bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live Neighborhood Grid
            </h3>
            <p className="text-xs text-slate-500">
              Tap coordinates to support open community tickets
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Streaming Live Points
          </div>
        </div>
        <IncidentMap
          issues={issues}
          centerCoordinates={mapCenter}
          onUpvote={handleUpvote}
        />
      </div>
    </div>
  );
}
