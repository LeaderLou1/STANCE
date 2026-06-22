"use client";

import React, { useState, useMemo } from "react";
import {
  Megaphone,
  BarChart3,
  Users,
  Send,
  Star,
  CheckCircle,
} from "lucide-react";

export interface IntelligenceData {
  zip_code: string;
  category: string;
  volume_of_concern: number;
  aggregate_voter_friction: number;
  resolution_rate: number;
}

// Ensure our component recognizes structural initiatives passed down from the parent state
interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category: string;
  zip_code: string;
  upvotes: number;
  sponsored_by_id: string | null;
}

interface CivicCRMProps {
  analyticsData: IntelligenceData[];
  initiatives?: CivicInitiative[]; // Passed from page.tsx state stream
  onSponsorInitiative?: (id: string) => Promise<void>; // Passed from page.tsx transaction handler
}

export function CivicCRM({
  analyticsData,
  initiatives = [],
  onSponsorInitiative,
}: CivicCRMProps) {
  const [selectedZip, setSelectedZip] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");

  // Extract distinct ZIP codes for filter dropdown menus
  const uniqueZips = useMemo(() => {
    return Array.from(new Set(analyticsData.map((d) => d.zip_code)));
  }, [analyticsData]);

  // Filter trends based on selected district vector
  const districtTrends = useMemo(() => {
    if (!selectedZip) return analyticsData;
    return analyticsData.filter((d) => d.zip_code === selectedZip);
  }, [analyticsData, selectedZip]);

  // Filter community initiatives based on the selected district dropdown
  const filteredInitiatives = useMemo(() => {
    if (!selectedZip) return initiatives;
    return initiatives.filter((i) => i.zip_code === selectedZip);
  }, [initiatives, selectedZip]);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZip || !broadcastMessage) return;

    alert(
      `📢 CRM Broadcast dispatched to all constituents in ZIP ${selectedZip} who interacted with this category.\nMessage: "${broadcastMessage}"`,
    );
    setBroadcastMessage("");
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL DROPDOWN ROUTER CONTROL */}
      <div className="flex justify-end bg-white border border-slate-200/60 p-4 rounded-xl shadow-sm">
        <select
          value={selectedZip}
          onChange={(e) => setSelectedZip(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-700 font-medium"
        >
          <option value="">All Voting Districts</option>
          {uniqueZips.map((zip) => (
            <option key={zip} value={zip}>
              ZIP Zone: {zip}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CAMPAIGN INTELLIGENCE METRICS PANEL */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Campaign Intelligence Dashboard
            </h3>
            <p className="text-xs text-gray-500">
              Real-time breakdown of structural voter concerns during election
              cycles.
            </p>
          </div>

          <div className="space-y-3">
            {districtTrends.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">
                No localized polling metrics available.
              </p>
            ) : (
              districtTrends.map((trend, idx) => (
                <div
                  key={idx}
                  className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900">
                      ZIP {trend.zip_code}
                    </span>
                    <div className="text-slate-500 mt-0.5">
                      {trend.category} Core Sector
                    </div>
                  </div>

                  <div className="flex gap-6 text-center">
                    <div>
                      <span className="block font-bold text-gray-900">
                        {trend.volume_of_concern}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Tickets
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-amber-600">
                        {trend.aggregate_voter_friction}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Friction Index
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-emerald-600">
                        {trend.resolution_rate}%
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Resolved
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AUTOMATED CONSTITUENT FEEDBACK LOOP PANEL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              Constituent Broadcast Loop
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Mass-message citizens who upvoted local infrastructure tickets
              inside specific geographic zones.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Target District
                </label>
                <select
                  required
                  value={selectedZip}
                  onChange={(e) => setSelectedZip(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">Select a ZIP zone to target...</option>
                  {uniqueZips.map((zip) => (
                    <option key={zip} value={zip}>
                      ZIP {zip} Micro-Community
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Official Response Update
                </label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder='e.g., "Thanks to your community upvotes, crew scheduling for the 4th Ave pothole repair has completed..."'
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedZip || !broadcastMessage}
                className="w-full flex items-center justify-center gap-2 bg-[#0f5132] hover:bg-[#0a3621] disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch CRM Feedback Broadcast
              </button>
            </form>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Messages are instantly pushed out via email alerts and localized
              feed notifications.
            </span>
          </div>
        </div>
      </div>

      {/* 🌟 NEW: CONSTITUENT INITIATIVE & COLLABORATION HUB */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Constituent Proposals & Collaboration Hub
          </h3>
          <p className="text-xs text-gray-500">
            Review organic, citizen-led community proposals. Sponsor high-upvote
            initiatives to back them with official district recognition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInitiatives.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 col-span-2 text-center">
              No local community proposals discovered in this district vector.
            </p>
          ) : (
            filteredInitiatives.map((item) => (
              <div
                key={item.id}
                className="border border-slate-100 rounded-xl p-4 flex flex-col justify-between gap-3 bg-slate-50/50"
              >
                <div className="text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-gray-900">
                      {item.title}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      ZIP {item.zip_code}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                    {item.category}
                  </span>
                  <p className="text-gray-600 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="text-gray-400 text-[11px]">
                    🔥{" "}
                    <span className="font-bold text-gray-700">
                      {item.upvotes}
                    </span>{" "}
                    community endorsements
                  </div>

                  {item.sponsored_by_id ? (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl font-bold text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" /> Endorsed by You
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        onSponsorInitiative && onSponsorInitiative(item.id)
                      }
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl transition-all text-[11px]"
                    >
                      Sponsor Initiative
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
