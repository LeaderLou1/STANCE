"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp, AlertTriangle, Users, Filter, Sparkles, Award } from "lucide-react";
import { CivicInitiative } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

export interface IntelligenceData {
  id: string;
  zip_code: string;
  district_name?: string;
  aggregate_voter_friction: number;
  primary_complaint_category: string;
  total_voter_contacts: number;
  sentiment_score?: number; // -1.0 (Very Negative) to +1.0 (Positive)
}

export interface CivicCRMProps {
  analyticsData?: IntelligenceData[];
  campaignAnalytics?: IntelligenceData[];
  initiatives?: CivicInitiative[];
  onSponsorInitiative?: (id: string) => Promise<void>;
  onDataChange?: () => void; // Optional callback to trigger parent re-fetch on realtime updates
}

export const CivicCRM: React.FC<CivicCRMProps> = ({
  analyticsData,
  campaignAnalytics,
  initiatives = [],
  onSponsorInitiative,
  onDataChange,
}) => {
  const [minFriction, setMinFriction] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sponsoringId, setSponsoringId] = useState<string | null>(null);

  // Setup Supabase Realtime subscription to listen for live updates
  useEffect(() => {
    const channel = supabase
      .channel("civic-crm-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
        },
        (payload) => {
          console.log("CRM telemetry updated via Realtime:", payload);
          if (onDataChange) {
            onDataChange();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onDataChange]);

  // Normalize intelligence dataset with fallback
  const intelligenceRecords = useMemo(() => {
    return analyticsData || campaignAnalytics || [];
  }, [analyticsData, campaignAnalytics]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    intelligenceRecords.forEach((item) => {
      if (item.primary_complaint_category) set.add(item.primary_complaint_category);
    });
    return ["All", ...Array.from(set)];
  }, [intelligenceRecords]);

  // Filter intelligence records based on criteria
  const filteredAnalytics = useMemo(() => {
    return intelligenceRecords.filter((item) => {
      const matchesFriction = item.aggregate_voter_friction >= minFriction;
      const matchesCat =
        selectedCategory === "All" || item.primary_complaint_category === selectedCategory;
      return matchesFriction && matchesCat;
    });
  }, [intelligenceRecords, minFriction, selectedCategory]);

  // Derived Campaign CRM Metrics
  const summaryMetrics = useMemo(() => {
    const totalContacts = filteredAnalytics.reduce((acc, curr) => acc + (curr.total_voter_contacts || 0), 0);
    const avgFriction = filteredAnalytics.length
      ? Math.round(filteredAnalytics.reduce((acc, curr) => acc + curr.aggregate_voter_friction, 0) / filteredAnalytics.length)
      : 0;
    const criticalZones = filteredAnalytics.filter((a) => a.aggregate_voter_friction > 70).length;

    return { totalContacts, avgFriction, criticalZones };
  }, [filteredAnalytics]);

  // One-click CSV Export Functionality
  const handleExportCSV = () => {
    if (!filteredAnalytics.length) return;

    const headers = ["ID", "ZIP Code", "District", "Voter Friction Score", "Primary Category", "Voter Contacts", "Sentiment Score"];
    const rows = filteredAnalytics.map((item) => [
      item.id,
      item.zip_code,
      item.district_name || "N/A",
      item.aggregate_voter_friction,
      `"${item.primary_complaint_category}"`,
      item.total_voter_contacts || 0,
      item.sentiment_score ?? "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `civic_crm_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSponsorClick = async (id: string) => {
    if (!onSponsorInitiative) return;
    setSponsoringId(id);
    try {
      await onSponsorInitiative(id);
    } finally {
      setSponsoringId(null);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-[#cbd5cc] bg-[#f3f1ec] p-6 shadow-sm">
      {/* Header & Export Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#123b2a] px-2 py-0.5 text-[10px] font-black uppercase text-white">Representative View</span>
            <span className="text-xs font-bold text-[#b7732d]">District CRM Engine</span>
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#17211d]">Campaign Intelligence & Friction Dashboard</h2>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!filteredAnalytics.length}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#123b2a] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#1e5b3d] disabled:opacity-40"
        >
          <Download className="h-4 w-4"/> Export District CSV
        </button>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#cbd5cc] bg-[#fffefa] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#647168]">
            <Users className="h-4 w-4 text-[#2f7d5b]"/> Total Reach Contacts
          </div>
          <p className="mt-2 text-2xl font-black text-[#17211d]">{summaryMetrics.totalContacts.toLocaleString()}</p>
        </div>

        <div className="rounded-lg border border-[#cbd5cc] bg-[#fffefa] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#647168]">
            <TrendingUp className="h-4 w-4 text-[#b7732d]"/> Avg Voter Friction
          </div>
          <p className="mt-2 text-2xl font-black text-[#17211d]">{summaryMetrics.avgFriction} / 100</p>
        </div>

        <div className="rounded-lg border border-[#cbd5cc] bg-[#fffefa] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#647168]">
            <AlertTriangle className="h-4 w-4 text-[#b84a39]"/> High-Risk Priority Zones
          </div>
          <p className="mt-2 text-2xl font-black text-[#b84a39]">{summaryMetrics.criticalZones}</p>
        </div>
      </div>

      {/* Control & Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#cbd5cc] bg-[#e9e7e0] p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#647168]"/>
          <span className="text-xs font-bold text-[#17211d]">Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#647168]">Min Friction Score:</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minFriction}
            onChange={(e) => setMinFriction(Number(e.target.value))}
            className="accent-[#123b2a]"
          />
          <span className="text-xs font-bold text-[#17211d]">{minFriction}+</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#647168]">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded border border-[#cbd5cc] bg-white px-2 py-1 text-xs font-medium outline-none focus:border-[#2f7d5b]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Intelligence Data Table */}
      <div className="overflow-x-auto rounded-lg border border-[#cbd5cc] bg-[#fffefa]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#cbd5cc] bg-[#e9e7e0] text-[11px] font-black uppercase text-[#647168]">
            <tr>
              <th className="px-4 py-3">ZIP Code</th>
              <th className="px-4 py-3">Top Category</th>
              <th className="px-4 py-3 text-center">Friction Score</th>
              <th className="px-4 py-3 text-center">Voter Contacts</th>
              <th className="px-4 py-3 text-right">Sentiment Scoring</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5cc]/60">
            {filteredAnalytics.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-xs font-semibold text-[#647168]">
                  No district telemetry matching these parameters.
                </td>
              </tr>
            ) : (
              filteredAnalytics.map((item) => {
                const isHighFriction = item.aggregate_voter_friction >= 70;
                return (
                  <tr key={item.id} className="hover:bg-[#f3f1ec]/50">
                    <td className="px-4 py-3 font-bold text-[#17211d]">{item.zip_code}</td>
                    <td className="px-4 py-3 text-[#365444]">{item.primary_complaint_category}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                          isHighFriction ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.aggregate_voter_friction} / 100
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#17211d]">
                      {item.total_voter_contacts || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="h-3 w-3 text-[#b7732d]"/>
                        <span>
                          {item.sentiment_score !== undefined
                            ? `${(item.sentiment_score * 100).toFixed(0)}% Positivity`
                            : "Baseline Neutral"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Initiatives Section */}
      {initiatives.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#cbd5cc]">
          <h3 className="text-sm font-black text-[#17211d]">District Civic Initiatives</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {initiatives.map((init) => (
              <div key={init.id} className="flex items-center justify-between rounded-lg border border-[#cbd5cc] bg-white p-3 shadow-sm">
                <div>
                  <h4 className="font-bold text-xs text-[#17211d]">{init.title}</h4>
                  <p className="text-[11px] text-[#647168] line-clamp-1">{init.description}</p>
                </div>
                {onSponsorInitiative && (
                  <button
                    onClick={() => handleSponsorClick(init.id)}
                    disabled={sponsoringId === init.id}
                    className="flex items-center gap-1 rounded bg-[#123b2a] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-[#1e5b3d] disabled:opacity-50"
                  >
                    <Award className="h-3 w-3"/>
                    {sponsoringId === init.id ? "Sponsoring..." : "Sponsor"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};