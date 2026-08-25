"use client";

import React from "react";
import { CouncilOfficial } from "@/src/types";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

interface DistrictOfficialCardProps {
  official: CouncilOfficial | null;
  zipCode: string;
}

export default function DistrictOfficialCard({ official, zipCode }: DistrictOfficialCardProps) {
  if (!official) {
    return (
      <div className="p-4 bg-white border border-[#cbd5cc] rounded-xl text-xs text-[#647168] flex items-center justify-between">
        <span>No official profile mapped directly for ZIP code: <strong>{zipCode}</strong></span>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white border border-[#cbd5cc] rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
      {/* Official Photo */}
      <img
        src={official.photoUrl}
        alt={official.name}
        className="w-20 h-20 rounded-full object-cover border-2 border-[#2f7d5b] shadow-inner shrink-0"
      />

      {/* Details */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-[#dbe8df] text-[#123b2a] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Council District {official.district} ({official.party})
          </span>
          <a
            href={official.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#2f7d5b] hover:underline flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" /> Official Website
          </a>
        </div>

        <h3 className="text-base font-black text-[#17211d]">{official.name}</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-1 text-xs text-[#647168] pt-1">
          <p className="flex items-center gap-1.5 truncate">
            <Phone className="w-3.5 h-3.5 text-[#2f7d5b] shrink-0" /> {official.phone}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 text-[#2f7d5b] shrink-0" /> {official.email}
          </p>
          <p className="flex items-center gap-1.5 sm:col-span-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#2f7d5b] shrink-0" /> {official.officeAddress}
          </p>
        </div>
      </div>
    </div>
  );
}