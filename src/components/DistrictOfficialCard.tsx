"use client";

import React from "react";
import { CouncilOfficial } from "@/src/types";
import { ExternalLink, Landmark } from "lucide-react";

interface DistrictOfficialCardProps {
  official: CouncilOfficial | null;
}

export default function DistrictOfficialCard({
  official,
}: DistrictOfficialCardProps) {
  if (!official) {
    return null;
  }

  return (
    <div className="flex items-start gap-4 border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
      <Landmark className="mt-1 h-6 w-6 shrink-0 text-[#2f7d5b]" />
      <div className="flex-1 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
          Current NYC Council Member
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#17211d]">
            {official.name}
          </h3>
          <a
            href={official.officialDirectoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-[#2f7d5b] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            NYC Council directory
          </a>
        </div>
        <p className="text-xs text-[#647168]">
          Council District {official.district}
          {official.term_start && official.term_end
            ? ` · Term ${new Date(official.term_start).getUTCFullYear()}–${new Date(official.term_end).getUTCFullYear()}`
            : " · Term dates unavailable"}
        </p>
      </div>
    </div>
  );
}