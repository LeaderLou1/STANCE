
"use client";

import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Activity,
  ArrowUpRight,
} from "lucide-react";

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
    <section
      aria-label={`District ${districtNumber} intelligence`}
      className="min-w-0 space-y-4 sm:space-y-6"
    >
      {/* Neighborhoods and jurisdictions */}
      {neighborhoods.length > 0 && (
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Neighborhoods &amp; Jurisdictions
            </h2>

            {communityBoards.length > 0 && (
              <p className="break-words text-xs font-semibold leading-5 text-neutral-600 sm:text-right">
                {communityBoards.join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((hood) => (
              <span
                key={hood}
                className="max-w-full break-words rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold leading-5 text-neutral-800"
              >
                {hood}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Municipal baseline and BID information */}
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* NYC 311 baseline */}
        <section
          aria-labelledby="district-311-heading"
          className="min-w-0 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Activity
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-emerald-600"
              />

              <h2
                id="district-311-heading"
                className="text-xs font-bold uppercase tracking-wider text-neutral-600"
              >
                NYC 311 Baseline
              </h2>
            </div>

            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
              Last 30 Days
            </span>
          </div>

          <div>
            <p className="break-words text-3xl font-black tabular-nums text-neutral-900 sm:text-4xl">
              {stats311.total30Days.toLocaleString()}
            </p>

            <p className="mt-1 text-sm leading-5 text-neutral-500">
              Municipal 311 requests logged in Council District{" "}
              {districtNumber}
            </p>
          </div>

          {stats311.topCategories.length > 0 ? (
            <div className="space-y-3 border-t border-neutral-100 pt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Top Municipal Friction Drivers
              </h3>

              <ul className="space-y-3">
                {stats311.topCategories.map((category) => (
                  <li
                    key={category.complaint_type}
                    className="flex min-w-0 items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 break-words font-medium leading-5 text-neutral-800">
                      {category.complaint_type}
                    </span>

                    <span className="shrink-0 font-bold tabular-nums text-neutral-700">
                      {category.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="border-t border-neutral-100 pt-4 text-sm leading-5 text-neutral-500">
              No category breakdown is currently available.
            </p>
          )}
        </section>

        {/* BIDs and direct office contact */}
        <section
          aria-labelledby="district-bids-heading"
          className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-2">
              <Building2
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-neutral-700"
              />

              <h2
                id="district-bids-heading"
                className="text-xs font-bold uppercase tracking-wider text-neutral-600"
              >
                Business Improvement Districts
              </h2>
            </div>

            {activeBids.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {activeBids.map((bid) => (
                  <li
                    key={bid}
                    className="max-w-full break-words rounded-lg border border-neutral-200 bg-[#fcfbf9] px-3 py-2 text-xs font-semibold leading-5 text-neutral-800"
                  >
                    {bid}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-5 text-neutral-500">
                No active Business Improvement Districts are currently listed
                for Council District {districtNumber}.
              </p>
            )}

            {/* Direct office contact */}
            {(officeAddress || officePhone || officeEmail) && (
              <div className="space-y-3 border-t border-neutral-100 pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  District Office Contact
                </h3>

                {officeAddress && (
                  <div className="flex min-w-0 items-start gap-3 text-sm leading-5 text-neutral-600">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                    />
                    <span className="min-w-0 break-words">
                      {officeAddress}
                    </span>
                  </div>
                )}

                {officePhone && (
                  <div className="flex min-w-0 items-center gap-3 text-sm">
                    <Phone
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-neutral-400"
                    />

                    <a
                      href={`tel:${officePhone}`}
                      className="min-h-11 min-w-0 break-all py-2 font-semibold text-neutral-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      {officePhone}
                    </a>
                  </div>
                )}

                {officeEmail && (
                  <div className="flex min-w-0 items-start gap-3 text-sm">
                    <Mail
                      aria-hidden="true"
                      className="mt-3 h-4 w-4 shrink-0 text-neutral-400"
                    />

                    <a
                      href={`mailto:${officeEmail}`}
                      className="min-h-11 min-w-0 break-all py-2 font-semibold leading-5 text-neutral-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      {officeEmail}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            href={`/?district=${districtNumber}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm font-bold leading-5 text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            <span>
              Report an Issue in District {districtNumber}
            </span>

            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            />
          </Link>
        </section>
      </div>
    </section>
  );
}
