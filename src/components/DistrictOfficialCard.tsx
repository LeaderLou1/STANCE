
"use client";

import {
  ExternalLink,
  Landmark,
} from "lucide-react";

import type { CouncilOfficial } from "@/src/types";

interface DistrictOfficialCardProps {
  official: CouncilOfficial | null;
}

export default function DistrictOfficialCard({
  official,
}: DistrictOfficialCardProps) {
  if (!official) {
    return null;
  }

  const termStart = official.term_start
    ? new Date(official.term_start)
    : null;

  const termEnd = official.term_end
    ? new Date(official.term_end)
    : null;

  const hasValidTerm =
    termStart &&
    termEnd &&
    !Number.isNaN(termStart.getTime()) &&
    !Number.isNaN(termEnd.getTime());

  const termLabel = hasValidTerm
    ? `${termStart.getUTCFullYear()}–${termEnd.getUTCFullYear()}`
    : "Term dates unavailable";

  const directoryUrl = official.officialDirectoryUrl;

  const validDirectoryUrl = (() => {
    if (!directoryUrl) return null;

    try {
      const url = new URL(directoryUrl);

      if (
        url.protocol !== "https:" ||
        url.hostname !== "council.nyc.gov"
      ) {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  })();

  return (
    <section
      aria-label={`Council member for District ${official.district}`}
      className="flex min-w-0 flex-col gap-3 border border-[#cbd5cc] bg-[#fffefa] p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4 sm:p-5"
    >
      <Landmark
        aria-hidden="true"
        className="h-6 w-6 shrink-0 text-[#2f7d5b] sm:mt-1"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
          Current NYC Council Member
        </p>

        <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h3 className="break-words text-lg font-black leading-tight text-[#17211d]">
            {official.name}
          </h3>

          {validDirectoryUrl && (
            <a
              href={validDirectoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${official.name} in the NYC Council directory (opens in a new tab)`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-[#2f7d5b] underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f7d5b]"
            >
              NYC Council directory
              <ExternalLink
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              />
            </a>
          )}
        </div>

        <p className="text-sm leading-5 text-[#647168]">
          Council District {official.district}
          <span aria-hidden="true"> · </span>
          <span>Term {termLabel}</span>
        </p>
      </div>
    </section>
  );
}
