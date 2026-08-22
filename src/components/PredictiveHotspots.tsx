"use client";

import React, { useMemo } from "react";

interface RiskData {
  county_name?: string; // 🌟 Added relative regional properties
  district_number?: string; // 🌟 Added council/district properties
  zip_code: string;
  category: string;
  total_complaints: number;
  aggregate_community_urgency: number | null;
  calculated_risk_score: number;
}

export function PredictiveHotspots({
  riskReports,
}: {
  riskReports: RiskData[];
}) {
  // Isolate highest risk vectors (e.g., scores over 70) for catastrophic failure alerts
  const criticalVectors = useMemo(() => {
    return riskReports.filter((report) => report.calculated_risk_score >= 70);
  }, [riskReports]);

  return (
    <div className="space-y-6 my-6">
      {/* CATASTROPHIC FAILURE RISK ALERTS */}
      <div className="border border-[#e6b7b0] bg-[#fdf0ed] p-5">
        <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider flex items-center gap-2">
          Predictive Maintenance Alert: High Probability Failure Zones
        </h3>
        <p className="text-xs text-red-700 mt-1">
          The following zones show high concentrations of minor structural
          indicators (cracks, leaks, structural decay) combined with heavy
          community escalation.
        </p>

        <div className="mt-4 space-y-2">
          {criticalVectors.length === 0 ? (
            <p className="text-xs italic text-red-600/70">
              No immediate high-probability catastrophic points tracked.
            </p>
          ) : (
            criticalVectors.map((vector, idx) => (
              <div
                key={idx}
                className="bg-white/80 border border-red-100 rounded-xl p-3 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-gray-900">
                    ZIP Zone {vector.zip_code}
                  </span>
                  {vector.county_name && (
                    <span className="text-slate-500 font-normal text-[11px]">
                      {" "}
                      ({vector.county_name} —{" "}
                      {vector.district_number || "Global"})
                    </span>
                  )}{" "}
                  —{" "}
                  <span className="text-red-700 font-medium">
                    {vector.category} System
                  </span>
                </div>
                <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded text-[10px]">
                  RISK INDEX: {vector.calculated_risk_score}/100
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DISTRICT RISK SCORE TABLE FOR B2B CLIENTS */}
      <div className="border border-[#cbd5cc] bg-[#fffefa] p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Real Estate & Insurance Risk Indices
            </h3>
            <p className="text-xs text-gray-500">
              Infrastructure underwriting telemetry aggregated by regional and
              operational sectors.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Data availability varies by deployment
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Location Matrix</th>
                <th className="py-2.5 px-3">Vector Class</th>
                <th className="py-2.5 px-3 text-center">Active Indicators</th>
                <th className="py-2.5 px-3 text-center">Community Friction</th>
                <th className="py-2.5 px-3 text-right">District Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {riskReports.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  {/* 🌟 Compound UI cell displaying macro County / meso District / micro ZIP */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-gray-900">
                      ZIP {row.zip_code}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {row.county_name || "Unassigned County"}{" "}
                      {row.district_number ? `— ${row.district_number}` : ""}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-600 align-middle">
                    {row.category}
                  </td>
                  <td className="py-3 px-3 text-center text-gray-700 font-medium align-middle">
                    {row.total_complaints}
                  </td>
                  <td className="py-3 px-3 text-center text-gray-700 font-medium align-middle">
                    {row.aggregate_community_urgency ?? "N/A"}
                  </td>
                  <td className="py-3 px-3 text-right align-middle">
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        row.calculated_risk_score >= 70
                          ? "bg-red-100 text-red-700"
                          : row.calculated_risk_score >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.calculated_risk_score} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
