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

const customPinIcon =
  typeof window !== "undefined"
    ? new L.DivIcon({
        html: `
          <div class="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-8 h-8 text-emerald-700 drop-shadow-md"
            >
              <path
                fill-rule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.005-.717 2.186-1.64 3.124-2.677c1.865-2.055 3.28-4.745 3.28-7.922c0-5.122-4.18-9-9.158-9C6.819 2 2.64 5.878 2.64 11c0 3.177 1.415 5.867 3.28 7.921c.938 1.038 2.119 1.96 3.125 2.677c.443.315.83.57 1.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        `,
        className: "custom-pinpoint-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
    : undefined;

function ChangeMapView({
  center,
}: {
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
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
    <div className="relative z-10 h-87.5 w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-md">
      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeMapView center={mapCenter} />

        {locatedIssues.map((issue) => (
          <Marker
            key={issue.id}
            position={[
              issue.lat as number,
              issue.lng as number,
            ]}
            icon={customPinIcon}
          >
            <Popup maxWidth={320} minWidth={240}>
              <div className="p-1">
                <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  {issue.category || "Issue"}
                </span>

                <h4 className="mt-1.5 text-sm font-extrabold leading-tight text-gray-900">
                  {issue.title || "Community Issue"}
                </h4>

                <p className="mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap pr-1 text-xs text-gray-600">
                  {issue.description ||
                    "No description provided."}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-gray-700">
                  <span>
                    Council District {issue.council_district ?? "unresolved"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onUpvote?.(issue.id)
                    }
                    className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
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