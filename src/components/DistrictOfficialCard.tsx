"use client";

import React from "react";
import { CouncilOfficial } from "@/src/types";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import Image from "next/image";

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
    <div className="flex flex-col items-start gap-5 rounded-xl border border-[#cbd5cc] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      {/* Official Photo */}
      <Image
  src={official.photoUrl}
  alt={official.name}
  width={80}
  height={80}
  className="h-20 w-20 shrink-0 rounded-full border-2 border-[#2f7d5b] object-cover shadow-inner"
/>

      {/* Details */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded bg-[#dbe8df] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#123b2a]">
            Council District {official.district} ({official.party})
          </span>

          <a
            href={official.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-[#2f7d5b] hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            Official Website
          </a>
        </div>

        <h3 className="text-base font-black text-[#17211d]">
          {official.name}
        </h3>

        <div className="grid grid-cols-1 gap-1 pt-1 text-xs text-[#647168] sm:grid-cols-2 sm:gap-x-4">
          <p className="flex items-center gap-1.5 truncate">
            <Phone className="h-3.5 w-3.5 shrink-0 text-[#2f7d5b]" />
            {official.phone}
          </p>

          <p className="flex items-center gap-1.5 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0 text-[#2f7d5b]" />
            {official.email}
          </p>

          <p className="flex items-center gap-1.5 truncate sm:col-span-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2f7d5b]" />
            {official.officeAddress}
          </p>
        </div>
      </div>
    </div>
  );
}