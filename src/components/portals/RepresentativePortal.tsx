// src/components/portals/RepresentativePortal.tsx
"use client";

import React from "react";
import { CivicCRM } from "@/src/components/CivicCRM";
import { IntelligenceData } from "@/src/components/CivicCRM";
import {
  Megaphone,
  BarChart3,
  TrendingUp,
  Users2,
  MailCheck,
} from "lucide-react";

interface RepresentativePortalProps {
  campaignAnalytics: IntelligenceData[];
}

export function RepresentativePortal({
  campaignAnalytics,
}: RepresentativePortalProps) {
  // Aggregate mock parameters to show off macro intelligence metrics to buyers
  const totalFriction = campaignAnalytics.reduce(
    (acc, curr) => acc + curr.aggregate_voter_friction,
    0,
  );
  const avgResolution = campaignAnalytics.length
    ? Math.round(
        campaignAnalytics.reduce((acc, curr) => acc + curr.resolution_rate, 0) /
          campaignAnalytics.length,
      )
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Enterprise-grade Header Block */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            Elected Official CRM Portal
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Evaluate high-priority concerns in your specific district, manage
            outreach, and broadcast resolution progress.
          </p>
        </div>
        <button
          onClick={() =>
            alert("Generating automated precinct PDF scorecard printout...")
          }
          className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-white/10"
        >
          Export District Scorecard
        </button>
      </div>

      {/* Premium Strategic KPIs Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Aggregate Voter Friction
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {totalFriction || "1,420"} pts
            </h4>
          </div>
          <TrendingUp className="w-8 h-8 text-rose-500 bg-rose-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Precinct Resolution Index
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              {avgResolution || "76"}% Efficiency
            </h4>
          </div>
          <BarChart3 className="w-8 h-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Broadcast Audience
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              12.4k Citizens
            </h4>
          </div>
          <Users2 className="w-8 h-8 text-blue-600 bg-blue-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Constituent Data Stream Grid Injection */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MailCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            District Voter Heatmaps & CRM Routing
          </h3>
        </div>
        <CivicCRM analyticsData={campaignAnalytics} />
      </div>
    </div>
  );
}
