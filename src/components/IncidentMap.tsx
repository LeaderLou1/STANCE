"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/src/lib/supabase";

export interface MapIssue {
  id: string;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  council_district?: number | null;
  zip_code?: string | null;
  upvotes?: number | null;
  lat?: number | null;
  lng?: number | null;
  urgency?: "high" | "normal" | string | null;
}

interface IncidentMapProps {
  issues: MapIssue[];
  centerCoordinates?: [number, number] | number[];
  onUpvote?: (id: string) => Promise<void>;
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: MapIssue;
  old: MapIssue;
}

// Fix Leaflet's default missing asset icon paths in Next.js.
if (typeof window !== "undefined") {
  delete (
    L.Icon.Default.prototype as L.Icon.Default & {
      _getIconUrl?: () => string;
    }
  )._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

// Dynamic Icon Generator for Standard vs High-Urgency Pulsing Pins
const createPinIcon = (isUrgent: boolean) => {
  if (typeof window === "undefined") return undefined;

  return new L.DivIcon({
    html: `
      <div class="relative flex items-center justify-center group">
        ${
          isUrgent
            ? `<div class="absolute w-10 h-10 rounded-full bg-red-500/30 animate-ping"></div>`
            : `<div class="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-pulse"></div>`
        }
        <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
          isUrgent ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        } shadow-lg transition-transform duration-200 ease-out group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.005-.717 2.186-1.64 3.124-2.677c1.865-2.055 3.28-4.745 3.28-7.922c0-5.122-4.18-9-9.158-9C6.819 2 2.64 5.878 2.64 11c0 3.177 1.415 5.867 3.28 7.921c.938 1.038 2.119 1.96 3.125 2.677c.443.315.83.57 1.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    className: "custom-pinpoint-wrapper",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
};

function ChangeMapView({
  center,
}: {
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export default function IncidentMap({
  issues: initialIssues,
  centerCoordinates = [40.7128, -74.006],
  onUpvote,
}: IncidentMapProps) {
  const [realtimeIssues, setRealtimeIssues] =
    useState<MapIssue[]>(initialIssues);

  const mapCenter: [number, number] = [
    Number(centerCoordinates[0]),
    Number(centerCoordinates[1]),
  ];

  useEffect(() => {
    const channel = supabase
      .channel("incident-map-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issues",
        },
        (payload) => {
          const typedPayload =
            payload as unknown as RealtimePayload;

          if (typedPayload.eventType === "INSERT") {
            setRealtimeIssues((previous) => [
              typedPayload.new,
              ...previous,
            ]);
          }

          if (typedPayload.eventType === "UPDATE") {
            setRealtimeIssues((previous) =>
              previous.map((issue) =>
                issue.id === typedPayload.new.id
                  ? typedPayload.new
                  : issue
              )
            );
          }

          if (typedPayload.eventType === "DELETE") {
            setRealtimeIssues((previous) =>
              previous.filter(
                (issue) =>
                  issue.id !== typedPayload.old.id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const issues = useMemo(() => {
    const realtimeIds = new Set(
      realtimeIssues.map((issue) => issue.id)
    );

    return [
      ...initialIssues.filter(
        (issue) => !realtimeIds.has(issue.id)
      ),
      ...realtimeIssues,
    ];
  }, [initialIssues, realtimeIssues]);

  const locatedIssues = useMemo(
    () =>
      issues.filter(
        (issue) =>
          issue.lat !== undefined &&
          issue.lat !== null &&
          issue.lng !== undefined &&
          issue.lng !== null
      ),
    [issues]
  );

  return (
    <div className="relative z-10 h-96 w-full overflow-hidden rounded-2xl border border-neutral-200/80 shadow-xl transition-all duration-300">
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <ChangeMapView center={mapCenter} />

        {locatedIssues.map((issue) => {
          const isUrgent =
            issue.urgency === "high" || (issue.upvotes ?? 0) > 15;
          const pinIcon = createPinIcon(isUrgent);

          return (
            <Marker
              key={issue.id}
              position={[
                issue.lat as number,
                issue.lng as number,
              ]}
              icon={pinIcon}
            >
              <Popup maxWidth={320} minWidth={240} className="rounded-xl shadow-2xl">
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isUrgent 
                        ? "border border-red-200 bg-red-50 text-red-700" 
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}>
                      {issue.category || "Community Issue"}
                    </span>
                    {isUrgent && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 animate-pulse">
                        ● HIGH PRIORITY
                      </span>
                    )}
                  </div>

                  <h4 className="mt-2 text-sm font-extrabold leading-tight text-neutral-900">
                    {issue.title || "Untitled Incident"}
                  </h4>

                  <p className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap pr-1 text-xs text-neutral-600 leading-relaxed">
                    {issue.description ||
                      "No description provided for this report."}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] font-semibold text-neutral-700">
                    <span className="text-neutral-500">
                      District {issue.council_district ?? "NYC"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onUpvote?.(issue.id)
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 shadow-sm"
                    >
                      ▲ {issue.upvotes || 0}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}