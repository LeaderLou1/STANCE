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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Premium Hub Header Banner */}
      <div className="border-b border-[#a9c8b3] bg-[#e5f0e7] p-6 text-[#17211d] shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f7d5b]">Representative workspace</p>
            <h2 className="flex items-center gap-2 text-3xl font-black tracking-[-0.05em]">
              <Megaphone className="h-7 w-7 text-[#2f7d5b]" />
              Listen, respond, follow through.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#496254]">
              Review verified community signals and coordinate the next public response from one operational workspace.
            </p>
          </div>
          <div className="border border-[#a9c8b3] bg-[#fffefa] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2f7d5b]">
            Live data workspace
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
