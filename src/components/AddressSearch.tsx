
"use client";

import { useState } from "react";
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";

interface GeosearchFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    label?: string;
    name?: string;
    [key: string]: unknown;
  };
}

interface DistrictResponse {
  districtNumber?: number;
  districtName?: string;
  districtId?: string;
  error?: string;
}

interface GeosearchResponse {
  features?: GeosearchFeature[];
}

export default function AddressSearch() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    address: string;
    districtNumber: number;
    districtName: string;
    districtId: string;
    lat: number;
    lng: number;
  } | null>(null);

  const handleSearch = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedAddress = address.trim();

    if (trimmedAddress.length < 5) {
      setError("Enter a complete street address.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Geocode the address.
      const geosearchUrl = new URL(
        "/api/geosearch",
        window.location.origin,
      );

      geosearchUrl.searchParams.set(
        "text",
        `${trimmedAddress}, New York City`,
      );

      const geosearchResponse = await fetch(
        geosearchUrl.toString(),
        { cache: "no-store" },
      );

      if (!geosearchResponse.ok) {
        throw new Error("Address lookup is temporarily unavailable.");
      }

      const geosearchData: GeosearchResponse =
        await geosearchResponse.json();

      const features = geosearchData.features;

      if (!Array.isArray(features) || features.length === 0) {
        throw new Error(
          "We couldn't find that address. Check the spelling and try again.",
        );
      }

      const feature = features[0];
      const coordinates = feature.geometry?.coordinates;

      if (
        !Array.isArray(coordinates) ||
        coordinates.length < 2
      ) {
        throw new Error(
          "The address result did not include valid coordinates.",
        );
      }

      const [lng, lat] = coordinates;

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        throw new Error("The address coordinates are invalid.");
      }

      // Step 2: Resolve the actual Council District using PostGIS.
      const districtResponse = await fetch(
        `/api/districts/resolve?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
        { cache: "no-store" },
      );

      const districtData: DistrictResponse =
        await districtResponse.json();

      if (!districtResponse.ok) {
        throw new Error(
          districtData.error ||
            "We couldn't determine the Council District for this address.",
        );
      }

      if (
        !districtData.districtNumber ||
        !districtData.districtId ||
        !districtData.districtName
      ) {
        throw new Error(
          "The district lookup returned incomplete information.",
        );
      }

      setResult({
        address:
          feature.properties?.label ||
          feature.properties?.name ||
          trimmedAddress,
        districtNumber: districtData.districtNumber,
        districtName: districtData.districtName,
        districtId: districtData.districtId,
        lat,
        lng,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 bg-[#f2f7f2] px-6 py-6">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#245b43] shadow-sm">
          <MapPin className="h-5 w-5" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
          Find your Council District
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Enter your NYC street address to identify the
          City Council district responsible for your neighborhood.
        </p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-semibold text-neutral-800"
            >
              Street address
            </label>

            <input
              id="address"
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setError(null);
                setResult(null);
              }}
              placeholder="e.g. 250 Broadway, Manhattan"
              maxLength={200}
              autoComplete="street-address"
              required
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#245b43] focus:ring-2 focus:ring-[#245b43]/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#245b43] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#194a35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding your district...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find my district
              </>
            )}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-sm leading-5 text-rose-800">
              {error}
            </p>
          </div>
        )}

        {result && (
          <div
            aria-live="polite"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              District successfully identified
            </div>

            <p className="mt-3 text-xs font-medium text-emerald-700">
              NYC COUNCIL DISTRICT
            </p>

            <p className="mt-1 text-3xl font-black tracking-tight text-emerald-950">
              {result.districtNumber}
            </p>

            <div className="mt-4 flex items-start gap-2 border-t border-emerald-200 pt-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  {result.districtName}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  {result.address}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-neutral-400">
          District boundaries are determined using geographic
          boundary data, not ZIP code estimates.
        </p>
      </div>
    </section>
  );
}
