"use client";

import React, { useMemo } from "react";
import {
  Megaphone,
  Building2,
  CheckCircle2,
  TrendingUp,
  Award,
} from "lucide-react";
import { CivicCRM, IntelligenceData } from "@/src/components/CivicCRM";
import { CivicInitiative } from "@/src/types";

export interface RepresentativePortalProps {
  campaignAnalytics: IntelligenceData[];
  initiatives?: CivicInitiative[];
  onSponsorInitiative?: (id: string) => Promise<void>;
  representativeDistrict?: string | number;
}

export function RepresentativePortal({
  campaignAnalytics = [],
  initiatives = [],
  onSponsorInitiative,
  representativeDistrict,
}: RepresentativePortalProps) {
  // Compute key executive metrics for the portal header
  const metrics = useMemo(() => {
    const totalSignals = campaignAnalytics.length;
    const sponsoredCount = initiatives.filter((i) => i.sponsored_by_id !== null).length;
    const totalUpvotes = initiatives.reduce((sum, item) => sum + (item.upvotes || 0), 0);

    return {
      totalSignals,
      sponsoredCount,
      totalUpvotes,
      totalInitiatives: initiatives.length,
    };
  }, [campaignAnalytics, initiatives]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Command Header Banner */}
      <div className="relative overflow-hidden border border-[#a9c8b3] bg-gradient-to-br from-[#e5f0e7] via-[#ebf4ed] to-[#d8e8dc] p-6 text-[#17211d] shadow-sm sm:p-8 rounded-xl">
        {/* Subtle Decorative Background Accent */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#2f7d5b]/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a9c8b3] bg-[#fffefa] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2f7d5b]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2f7d5b] animate-pulse" />
                Live District Intelligence
              </span>
              {representativeDistrict && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#3c5446]">
                  <Building2 className="h-3.5 w-3.5 text-[#2f7d5b]" />
                  District {representativeDistrict}
                </span>
              )}
            </div>

            <h2 className="flex items-center gap-3 text-3xl font-black tracking-[-0.04em] text-[#17211d] sm:text-4xl">
              <Megaphone className="h-8 w-8 text-[#2f7d5b] shrink-0" />
              Listen, respond, follow through.
            </h2>

            <p className="max-w-2xl text-sm leading-relaxed text-[#496254]">
              Review verified community signals, prioritize neighborhood initiatives, and coordinate public action from your central operational workspace.
            </p>
          </div>

          {/* Quick Stat Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="flex flex-col border border-[#a9c8b3]/60 bg-[#fffefa]/80 backdrop-blur-sm p-3 rounded-lg shadow-2xs">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#496254]">
                <TrendingUp className="h-3 w-3 text-[#2f7d5b]" /> Signals
              </span>
              <span className="text-xl font-black tracking-tight text-[#17211d] mt-1">
                {metrics.totalSignals}
              </span>
            </div>

            <div className="flex flex-col border border-[#a9c8b3]/60 bg-[#fffefa]/80 backdrop-blur-sm p-3 rounded-lg shadow-2xs">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#496254]">
                <Award className="h-3 w-3 text-[#2f7d5b]" /> Sponsored
              </span>
              <span className="text-xl font-black tracking-tight text-[#17211d] mt-1">
                {metrics.sponsoredCount} / {metrics.totalInitiatives}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 flex flex-col border border-[#a9c8b3]/60 bg-[#fffefa]/80 backdrop-blur-sm p-3 rounded-lg shadow-2xs">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#496254]">
                <CheckCircle2 className="h-3 w-3 text-[#2f7d5b]" /> Upvotes
              </span>
              <span className="text-xl font-black tracking-tight text-[#17211d] mt-1">
                {metrics.totalUpvotes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Central Command Matrix Layout */}
      <div className="bg-[#fffefa] border border-[#cbd5cc] rounded-xl p-1 sm:p-2 shadow-2xs">
        <CivicCRM
          analyticsData={campaignAnalytics}
          initiatives={initiatives}
          onSponsorInitiative={onSponsorInitiative}
        />
      </div>
    </div>
  );
}