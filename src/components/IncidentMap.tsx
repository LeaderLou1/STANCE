"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🌟 Fix Leaflet's default missing asset icon paths in Next.js environments
if (typeof window !== "undefined") {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

// Custom vector SVG pinpoint icon
const customPinIcon =
  typeof window !== "undefined"
    ? new L.DivIcon({
        html: `
    <div class="flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-emerald-700 drop-shadow-md">
        <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.005-.717 2.186-1.64 3.124-2.677c1.865-2.055 3.28-4.745 3.28-7.922c0-5.122-4.18-9-9.158-9C6.819 2 2.64 5.878 2.64 11c0 3.177 1.415 5.867 3.28 7.921c.938 1.038 2.119 1.96 3.125 2.677c.443.315.83.57 1.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" clip-rule="evenodd" />
      </svg>
    </div>
  `,
        className: "custom-pinpoint-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
    : null;

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface IncidentMapProps {
  issues: any[];
  centerCoordinates?: [number, number];
  onUpvote?: (id: string) => Promise<void>; // 🌟 Added type definition for parent action
}

export default function IncidentMap({
  issues,
  centerCoordinates = [40.7128, -74.006],
  onUpvote,
}: IncidentMapProps) {
  // Prevent hydration layout flashes on server passes
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-87.5 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
    );
  }

  const landCoordinatesIssues = issues.filter(
    (issue) =>
      issue.lat !== undefined &&
      issue.lat !== null &&
      issue.lng !== undefined &&
      issue.lng !== null,
  );

  return (
    <div className="w-full h-87.5 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md relative z-10">
      <MapContainer
        center={centerCoordinates}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView center={centerCoordinates} />

        {landCoordinatesIssues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.lat, issue.lng]}
            icon={customPinIcon || undefined}
          >
            {/* 🌟 Set dynamic maximum popup width boundaries */}
            <Popup maxWidth={320} minWidth={240}>
              <div className="p-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {issue.category}
                </span>
                <h4 className="font-extrabold text-gray-900 mt-1.5 text-sm leading-tight">
                  {issue.title}
                </h4>

                {/* 🌟 FIX: Removed line-clamp-2. Added full wrapper with dynamic height scroll bars */}
                <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap `wrap-break-word` max-h-36 overflow-y-auto pr-1">
                  {issue.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold text-gray-700 flex justify-between items-center">
                  <span>📍 Zone: {issue.zip_code}</span>

                  {/* 🌟 ACTIONABLE UPVOTE BUTTON LAYOUT */}
                  <button
                    onClick={() => onUpvote && onUpvote(issue.id)}
                    className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-100 transition duration-150 font-bold active:scale-95"
                  >
                    ▲ {issue.upvotes || 0} votes
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
