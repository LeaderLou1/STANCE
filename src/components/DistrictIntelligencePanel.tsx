"use client";

import React from "react";
import Link from "next/link";
import { Building2, MapPin, Phone, Mail, Activity, ArrowUpRight } from "lucide-react";
import type { District311Stats } from "@/src/lib/nyc311";

interface DistrictIntelligencePanelProps {
  districtNumber: number;
  neighborhoods: string[];
  activeBids: string[];
  communityBoards: string[];
  officeAddress?: string | null;
  officePhone?: string | null;
  officeEmail?: string | null;
  stats311: District311Stats;
}

export function DistrictIntelligencePanel({
  districtNumber,
  neighborhoods,
  activeBids,
  communityBoards,
  officeAddress,
  officePhone,
  officeEmail,
  stats311,
}: DistrictIntelligencePanelProps) {
  return (
    <div className="space-y-6">
      {/* Neighborhoods & Jurisdictions */}
      {neighborhoods.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Neighborhoods &amp; Jurisdictions
            </span>
            {communityBoards.length > 0 && (
              <span className="text-xs font-semibold text-neutral-600">
                {communityBoards.join(" · ")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((hood) => (
              <span
                key={hood}
                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
              >
                {hood}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day NYC 311 Baseline + Active BIDs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live 311 Municipal Telemetry */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                NYC 311 Baseline (Last 30 Days)
              </h3>
            </div>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              Live OpenData
            </span>
          </div>

          <div>
            <p className="text-3xl font-black text-neutral-900">
              {stats311.total30Days.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">
              Municipal 311 requests logged in District {districtNumber}
            </p>
          </div>

          {stats311.topCategories.length > 0 && (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Top Municipal Friction Drivers
              </p>
              {stats311.topCategories.map((cat) => (
                <div
                  key={cat.complaint_type}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-neutral-800 truncate pr-2">
                    {cat.complaint_type}
                  </span>
                  <span className="font-bold text-neutral-600">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active BIDs & Direct Constituent Action */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-neutral-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Business Improvement Districts
              </h3>
            </div>

            {activeBids.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {activeBids.map((bid) => (
                  <span
                    key={bid}
                    className="rounded-lg border border-neutral-200 bg-[#fcfbf9] px-2.5 py-1 text-xs font-semibold text-neutral-800"
                  >
                    {bid}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Commercial district intelligence active for District {districtNumber}.
              </p>
            )}

            {/* Direct Office Contact */}
            <div className="space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
              {officeAddress && (
                <p className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-neutral-400" />
                  <span>{officeAddress}</span>
                </p>
              )}
              {officePhone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <a href={`tel:${officePhone}`} className="font-semibold hover:underline">
                    {officePhone}
                  </a>
                </p>
              )}
              {officeEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <a href={`mailto:${officeEmail}`} className="font-semibold hover:underline">
                    {officeEmail}
                  </a>
                </p>
              )}
            </div>
          </div>

          <Link
            href={`/?district=${districtNumber}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"
          >
            Report an Issue in District {districtNumber}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}