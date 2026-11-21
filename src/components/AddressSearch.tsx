
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  RotateCcw,
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
  error?: string;
}

interface AddressResult {
  address: string;
  districtNumber: number;
  districtName: string;
  districtId: string;
  lat: number;
  lng: number;
}

function isValidNYCCoordinate(lat: number, lng: number): boolean {
  // Broad NYC-area guard, not a substitute for polygon containment.
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 40.45 &&
    lat <= 40.95 &&
    lng >= -74.3 &&
    lng <= -73.65
  );
}

export default function AddressSearch() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddressResult | null>(null);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedAddress = address.trim();

    if (trimmedAddress.length < 5) {
      setError("Enter a complete street address.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Geocode the NYC address.
      const geosearchUrl = new URL(
        "/api/geosearch",
        window.location.origin
      );

      geosearchUrl.searchParams.set(
        "text",
        `${trimmedAddress}, New York City`
      );

      const geosearchResponse = await fetch(
        geosearchUrl.toString(),
        {
          cache: "no-store",
        }
      );

      const geosearchData =
        (await geosearchResponse.json()) as GeosearchResponse;

      if (!geosearchResponse.ok) {
        throw new Error(
          geosearchData.error ||
            "Address lookup is temporarily unavailable."
        );
      }

      const features = geosearchData.features;

      if (!Array.isArray(features) || features.length === 0) {
        throw new Error(
          "We couldn't find that address. Check the spelling and try again."
        );
      }

      const feature = features[0];
      const coordinates = feature.geometry?.coordinates;

      if (
        !Array.isArray(coordinates) ||
        coordinates.length < 2
      ) {
        throw new Error(
          "The address result did not include valid coordinates."
        );
      }

      const [lng, lat] = coordinates;

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !isValidNYCCoordinate(lat, lng)
      ) {
        throw new Error(
          "That address does not appear to be within the New York City area. Please check the address."
        );
      }

      // Step 2: Resolve the actual Council District using PostGIS.
      const districtUrl = new URL(
        "/api/districts/resolve",
        window.location.origin
      );

      districtUrl.searchParams.set("lat", String(lat));
      districtUrl.searchParams.set("lng", String(lng));

      const districtResponse = await fetch(
        districtUrl.toString(),
        {
          cache: "no-store",
        }
      );

      const districtData =
        (await districtResponse.json()) as DistrictResponse;

      if (!districtResponse.ok) {
        throw new Error(
          districtData.error ||
            "We couldn't determine the Council District for this address."
        );
      }

      if (
        typeof districtData.districtNumber !== "number" ||
        !Number.isInteger(districtData.districtNumber) ||
        districtData.districtNumber < 1 ||
        districtData.districtNumber > 51 ||
        !districtData.districtId ||
        !districtData.districtName
      ) {
        throw new Error(
          "The district lookup returned incomplete or invalid information."
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
      console.error("Address district lookup failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setAddress("");
    setError(null);
    setResult(null);
  };

  return (
    <section className="mx-auto mt-6 w-full min-w-0 max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm sm:mt-10">
      {/* Header */}
      <div className="border-b border-neutral-100 bg-[#f2f7f2] px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#245b43] shadow-sm">
          <MapPin
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
          Find your Council District
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Enter your NYC street address to identify the City Council
          district responsible for your neighborhood.
        </p>
      </div>

      <div className="p-4 sm:p-6">
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
              autoCapitalize="words"
              spellCheck={false}
              required
              disabled={loading}
              className="min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#245b43] focus:ring-2 focus:ring-[#245b43]/15 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#245b43] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#194a35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
                Finding your district...
              </>
            ) : (
              <>
                <Search
                  aria-hidden="true"
                  className="h-4 w-4"
                />
                Find my district
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
            />

            <p className="min-w-0 break-words text-sm leading-6 text-rose-800">
              {error}
            </p>
          </div>
        )}

        {/* Successful district lookup */}
        {result && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
              />
              District successfully identified
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700">
              NYC Council District
            </p>

            <p className="mt-1 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
              {result.districtNumber}
            </p>

            <div className="mt-4 flex min-w-0 items-start gap-3 border-t border-emerald-200 pt-4">
              <Building2
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              />

              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-emerald-900">
                  {result.districtName}
                </p>

                <p className="mt-1 break-words text-sm leading-5 text-emerald-800">
                  {result.address}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSearch}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <RotateCcw
                aria-hidden="true"
                className="h-4 w-4"
              />
              Search another address
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-neutral-500">
          District boundaries are determined using geographic boundary
          data, not ZIP code estimates.
        </p>
      </div>
    </section>
  );
}
