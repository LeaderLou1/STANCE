
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
  zoom?: number;
  focusRequest?: number;
  onUpvote?: (id: string) => Promise<void>;
  onSelectIssue?: (issue: MapIssue) => void;
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: MapIssue;
  old: MapIssue;
}

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

const createPinIcon = (isUrgent: boolean) => {
  if (typeof window === "undefined") return undefined;

  return new L.DivIcon({
    html: `
      <div class="incident-pin">
        <div class="incident-pin-pulse ${
          isUrgent ? "incident-pin-pulse-urgent" : ""
        }"></div>
        <div class="incident-pin-core ${
          isUrgent ? "incident-pin-core-urgent" : ""
        }">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.005-.717 2.186-1.64 3.124-2.677c1.865-2.055 3.28-4.745 3.28-7.922c0-5.122-4.18-9-9.158-9C6.819 2 2.64 5.878 2.64 11c0 3.177 1.415 5.867 3.28 7.921c.938 1.038 2.119 1.96 3.125 2.677c.443.315.83.57 1.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
    `,
    className: "custom-pinpoint-wrapper",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
};

function ChangeMapView({
  center,
  zoom,
  focusRequest,
}: {
  center: [number, number];
  zoom: number;
  focusRequest: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
  }, [center, zoom, focusRequest, map]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    if (typeof ResizeObserver === "undefined") {
      map.invalidateSize({ pan: false });
      return;
    }

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function IncidentMap({
  issues: initialIssues,
  centerCoordinates = [40.7128, -74.006],
  zoom = 13,
  focusRequest = 0,
  onUpvote,
  onSelectIssue,
}: IncidentMapProps) {
  const [realtimeIssues, setRealtimeIssues] =
    useState<MapIssue[]>(initialIssues);

  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

  const [usePublicTiles, setUsePublicTiles] =
    useState(!cartoApiKey);

  const mapCenter: [number, number] = [
    Number(centerCoordinates[0]),
    Number(centerCoordinates[1]),
  ];

  const tileUrl =
    usePublicTiles || !cartoApiKey
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`;

  useEffect(() => {
    const channel = supabase
      .channel(`incident-map-realtime:${crypto.randomUUID()}`)
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
            setRealtimeIssues((previous) => {
              const alreadyExists = previous.some(
                (issue) => issue.id === typedPayload.new.id
              );

              if (alreadyExists) return previous;

              return [typedPayload.new, ...previous];
            });
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
                (issue) => issue.id !== typedPayload.old.id
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
          typeof issue.lat === "number" &&
          Number.isFinite(issue.lat) &&
          issue.lat >= -90 &&
          issue.lat <= 90 &&
          typeof issue.lng === "number" &&
          Number.isFinite(issue.lng) &&
          issue.lng >= -180 &&
          issue.lng <= 180
      ),
    [issues]
  );

  return (
    <section
      aria-label="Community incident map"
      className="incident-map-shell relative z-10 h-[min(68svh,560px)] min-h-[360px] w-full overflow-hidden rounded-2xl border border-neutral-200/80 shadow-xl sm:h-[480px] sm:min-h-[420px] lg:h-[560px]"
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        maxZoom={19}
        minZoom={10}
        scrollWheelZoom={false}
        touchZoom={true}
        doubleClickZoom={true}
        keyboard={true}
        zoomControl={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setUsePublicTiles(true),
          }}
        />

        <ChangeMapView
          center={mapCenter}
          zoom={zoom}
          focusRequest={focusRequest}
        />

        <MapResizeHandler />

        {locatedIssues.map((issue) => {
          const isUrgent =
            issue.urgency === "high" ||
            (issue.upvotes ?? 0) > 15;

          const pinIcon = createPinIcon(isUrgent);

          return (
            <Marker
              key={issue.id}
              position={[issue.lat!, issue.lng!]}
              icon={pinIcon}
              alt={issue.title || "Community issue location"}
              keyboard={true}
              eventHandlers={{
                click: () => onSelectIssue?.(issue),
              }}
            >
              <Popup
                maxWidth={280}
                minWidth={180}
                autoPan={true}
                autoPanPadding={[24, 24]}
                className="incident-map-popup"
              >
                <div className="w-full min-w-0 p-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex max-w-full rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isUrgent
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {issue.category || "Community Issue"}
                    </span>

                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                        <span aria-hidden="true">●</span>
                        High priority
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 break-words text-sm font-extrabold leading-snug text-neutral-900">
                    {issue.title || "Untitled Incident"}
                  </h3>

                  <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-xs leading-relaxed text-neutral-600">
                    {issue.description ||
                      "No description provided for this report."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                    <span className="text-xs font-semibold text-neutral-500">
                      District {issue.council_district ?? "NYC"}
                    </span>

                    <button
                      type="button"
                      disabled={!onUpvote}
                      aria-label={`Upvote ${issue.title || "this issue"}. Current votes: ${issue.upvotes ?? 0}`}
                      onClick={() => {
                        if (onUpvote) {
                          void onUpvote(issue.id);
                        }
                      }}
                      className="inline-flex min-h-11 min-w-20 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span aria-hidden="true">▲</span>
                      <span>{issue.upvotes ?? 0}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style jsx global>{`
        .incident-map-shell .leaflet-container {
          width: 100%;
          height: 100%;
          background: #e9eee9;
          font-family: inherit;
          z-index: 1;
          touch-action: pan-x pan-y;
        }

        .incident-map-shell .leaflet-control-zoom {
          border: 1px solid rgba(23, 33, 29, 0.14) !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12) !important;
        }

        .incident-map-shell .leaflet-control-zoom a {
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          line-height: 1;
          color: #17211d;
        }

        .incident-map-shell .leaflet-control-attribution {
          max-width: calc(100% - 12px);
          padding: 3px 6px;
          border-radius: 5px 0 0 0;
          font-size: 10px;
          line-height: 1.4;
        }

        .incident-map-shell .leaflet-popup-content-wrapper {
          max-width: min(280px, calc(100vw - 64px));
          border-radius: 14px;
        }

        .incident-map-shell .leaflet-popup-content {
          width: auto !important;
          max-width: min(248px, calc(100vw - 96px));
          margin: 12px;
        }

        .incident-map-shell .leaflet-popup-close-button {
          display: flex !important;
          width: 36px !important;
          height: 36px !important;
          align-items: center;
          justify-content: center;
          font-size: 22px !important;
          color: #46534a !important;
        }

        .incident-map-shell .leaflet-marker-icon {
          outline: none;
        }

        .incident-map-shell .leaflet-marker-icon:focus-visible {
          outline: 3px solid #123b2a;
          outline-offset: 3px;
          border-radius: 50%;
        }

        .custom-pinpoint-wrapper {
          background: transparent;
          border: 0;
        }

        .incident-pin {
          position: relative;
          display: flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
        }

        .incident-pin-pulse {
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: rgba(5, 150, 105, 0.2);
          animation: incident-pin-pulse 2s ease-out infinite;
        }

        .incident-pin-pulse-urgent {
          width: 44px;
          height: 44px;
          background: rgba(220, 38, 38, 0.25);
        }

        .incident-pin-core {
          position: relative;
          z-index: 1;
          display: flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          border-radius: 9999px;
          background: #059669;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .incident-pin-core-urgent {
          background: #dc2626;
        }

        @keyframes incident-pin-pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .incident-map-shell *,
          .incident-map-shell *::before,
          .incident-map-shell *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }

        @media (max-width: 480px) {
          .incident-map-shell .leaflet-control-zoom {
            margin: 10px !important;
          }

          .incident-map-shell .leaflet-control-attribution {
            font-size: 9px;
          }
        }
      `}</style>
    </section>
  );
}
