"use client";

import React from "react";
import { Megaphone } from "lucide-react";
import { CivicCRM, IntelligenceData } from "@/src/components/CivicCRM";

// Define the structure of an initiative to keep TypeScript happy
interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category: string;
  zip_code: string;
  upvotes: number;
  sponsored_by_id: string | null;
}

interface RepresentativePortalProps {
  campaignAnalytics: IntelligenceData[];
  initiatives?: CivicInitiative[]; // 🌟 Added array stream from parent database
  onSponsorInitiative?: (id: string) => Promise<void>; // 🌟 Added transaction function callback
}

export function RepresentativePortal({
  campaignAnalytics,
  initiatives = [],
  onSponsorInitiative,
}: RepresentativePortalProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Premium Hub Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">
              <Megaphone className="w-5 h-5 text-emerald-400" />
              Elected Official CRM Portal
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Evaluate hot-button voter concerns, manage local community
              proposals, and dispatch instant district broadcast loops.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold tracking-wider uppercase text-[10px] px-3 py-1 rounded-full shadow-inner">
            Precinct Tier Access Enabled
          </div>
        </div>
      </div>

      {/* Central Command Matrix Layout */}
      <CivicCRM
        analyticsData={campaignAnalytics}
        initiatives={initiatives}
        onSponsorInitiative={onSponsorInitiative}
      />
    </div>
  );
}
