"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Landmark,
  MapPin,
} from "lucide-react";

interface DistrictIssue {
  id: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  created_at: string;
  upvotes: number;
}

interface DistrictProfileData {
  district: { id: string; number: number; name: string };
  representative: {
    name: string;
    district: string;
  } | null;
  officialDirectoryUrl: string;
  stats: { total: number; inProgress: number; resolved: number };
  issues: DistrictIssue[];
}

interface CouncilOfficial {
  district: number;
  name: string;
  term_start: string | null;
  term_end: string | null;
  officialDirectoryUrl: string;
}

function formatTerm(start: string | null, end: string | null) {
  if (!start && !end) return "Term dates unavailable";
  const year = (value: string | null) =>
    value ? new Date(value).getUTCFullYear() : null;
  const startYear = year(start);
  const endYear = year(end);
  if (startYear && endYear) return `${startYear}–${endYear} term`;
  if (endYear) return `Term through ${endYear}`;
  return `Term began ${startYear}`;
}

export function DistrictProfile({ number }: { number: number }) {
  const [profile, setProfile] = useState<DistrictProfileData | null>(null);
  const [official, setOfficial] = useState<CouncilOfficial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      fetch(`/api/districts/${number}`, { signal: controller.signal }),
      fetch(`/api/councilmembers?district=${number}`, {
        signal: controller.signal,
      }),
    ])
      .then(async ([profileResponse, officialResponse]) => {
        const profileResult = (await profileResponse.json()) as
          | DistrictProfileData
          | { error?: string };
        if (!profileResponse.ok || !("district" in profileResult)) {
          throw new Error(
            "error" in profileResult
              ? profileResult.error
              : "Could not load district information.",
          );
        }
        setProfile(profileResult);

        if (officialResponse.ok) {
          const officialResult = (await officialResponse.json()) as {
            official?: CouncilOfficial;
          };
          setOfficial(officialResult.official ?? null);
        }
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load district information.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [number]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] p-6">
        <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8">
          <h1 className="text-xl font-black text-neutral-900">
            District information unavailable
          </h1>
          <p role="alert" className="mt-2 text-sm text-red-800">
            {error || "This district could not be found."}
          </p>
          <Link
            href="/districts"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Browse all districts
          </Link>
        </div>
      </main>
    );
  }

  const councilMember = official;
  const progressPercent = profile.stats.total
    ? Math.round((profile.stats.resolved / profile.stats.total) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#17211d]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123b2a] text-sm font-black text-white">
              ST
            </span>
            <span className="text-sm font-black tracking-wide">STANCE</span>
          </Link>
          <Link
            href="/districts"
            className="text-sm font-bold text-neutral-600 transition hover:text-emerald-800"
          >
            All districts
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href="/districts"
          className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 transition hover:text-emerald-800"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          NYC Council Districts
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-[#123b2a] text-white">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c8dfce]">
                New York City · Community profile
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                Council District {profile.district.number}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#e2eee5] sm:text-base">
                Meet your district’s elected official, see what neighbors have
                reported, and report a problem of your own.
              </p>
            </div>
            <a
              href={profile.officialDirectoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#123b2a] transition hover:bg-[#e8eee9]"
            >
              Official district site
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Approved community reports
            </p>
            <p className="mt-3 text-3xl font-black">{profile.stats.total}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <Clock3 aria-hidden="true" className="h-4 w-4 text-amber-700" />
              In progress
            </p>
            <p className="mt-3 text-3xl font-black">{profile.stats.inProgress}</p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-700" />
              Resolved
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-black">{profile.stats.resolved}</p>
              <p className="text-xs font-semibold text-neutral-500">
                {progressPercent}% of reports
              </p>
            </div>
          </article>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="self-start rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Your elected official
            </p>
            {councilMember ? (
              <>
                <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Landmark aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight">
                  {councilMember.name}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                  <MapPin aria-hidden="true" className="h-4 w-4" />
                  NYC Council Member · District {profile.district.number}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  {formatTerm(councilMember.term_start, councilMember.term_end)}
                </p>
                <a
                  href={official?.officialDirectoryUrl ?? profile.officialDirectoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"
                >
                  Contact and official details
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              </>
            ) : (
              <div className="mt-5">
                <p className="text-lg font-bold">
                  {profile.representative?.name ??
                    "Official information is being updated."}
                </p>
                {profile.representative?.name && (
                  <p className="mt-2 text-sm text-neutral-600">
                    Council District {profile.district.number}
                  </p>
                )}
                <a
                  href={profile.officialDirectoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"
                >
                  Check the NYC Council directory
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Neighborhood issues
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  What residents are reporting
                </h2>
              </div>
              <Link
                href="/"
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#123b2a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0c2a1e]"
              >
                Report a problem
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            {profile.issues.length ? (
              <div className="mt-5 space-y-3">
                {profile.issues.map((issue) => (
                  <article
                    key={issue.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {issue.category}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">
                        {issue.status}
                      </span>
                    </div>
                    <h3 className="mt-3 font-bold leading-6">{issue.title}</h3>
                    <p className="mt-2 text-xs text-neutral-500">
                      Reported{" "}
                      {new Date(issue.created_at).toLocaleDateString()} ·{" "}
                      {issue.upvotes} community {issue.upvotes === 1 ? "vote" : "votes"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white p-8">
                <Building2 aria-hidden="true" className="h-6 w-6 text-neutral-400" />
                <p className="mt-3 font-bold">No approved reports yet</p>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  Community reports for this district will appear here after
                  they are approved.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}