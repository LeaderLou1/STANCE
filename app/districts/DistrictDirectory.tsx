"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Search } from "lucide-react";

interface DistrictOption {
  id: string;
  number: number;
  name: string;
  representativeName: string | null;
}

export function DistrictDirectory() {
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/districts", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as {
          districts?: DistrictOption[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error || "Could not load council districts.");
        }
        setDistricts(result.districts ?? []);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load council districts.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filteredDistricts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return districts;
    return districts.filter(
      (district) =>
        district.name.toLocaleLowerCase().includes(query) ||
        district.representativeName?.toLocaleLowerCase().includes(query),
    );
  }, [districts, search]);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#17211d]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123b2a] text-sm font-black text-white">
              ST
            </span>
            <span>
              <span className="block text-sm font-black tracking-wide">STANCE</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Civic intelligence
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-bold text-neutral-600 transition hover:text-emerald-800"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            New York City · 51 council districts
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Find your district.
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            Meet your City Council member, see who represents your district on
            STANCE, and follow the local issues residents have reported.
          </p>
        </div>

        <label className="relative mt-8 block max-w-xl">
          <span className="sr-only">Search districts or council members</span>
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search district number or council member"
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        {loading ? (
          <div
            role="status"
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-neutral-200 bg-white"
              />
            ))}
            <span className="sr-only">Loading council districts...</span>
          </div>
        ) : error ? (
          <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </p>
        ) : filteredDistricts.length === 0 ? (
          <p className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
            No districts match that search.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDistricts.map((district) => (
              <Link
                key={district.id}
                href={`/districts/${district.number}`}
                className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <Building2 aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-emerald-800"
                  />
                </div>
                <h2 className="mt-5 text-lg font-extrabold tracking-tight">
                  Council District {district.number}
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {district.representativeName ?? "Council member information"}
                </p>
                <p className="mt-4 text-xs font-bold text-emerald-800">
                  View district profile
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
