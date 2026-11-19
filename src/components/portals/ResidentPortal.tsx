"use client";

import { Sparkles } from "lucide-react";
import { StatsHeader } from "@/src/components/StatsHeader";
import { CivicIssue } from "@/src/types";

interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category: string;
  council_district?: number | null;
}

interface ResidentPortalProps {
  issues: CivicIssue[];
  initiatives?: CivicInitiative[];
}

export function ResidentPortal({
  issues,
  initiatives = [],
}: ResidentPortalProps) {
  const resolved = issues.filter((issue) => issue.status === "Resolved").length;
  const inProgress = issues.filter((issue) => issue.status === "In Progress").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Community pulse
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-neutral-900">
            Local progress at a glance
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          Live data
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <StatsHeader
          stats={{
            total: issues.length,
            inProgress,
            resolved,
            rate: issues.length
              ? Math.round((resolved / issues.length) * 100)
              : 0,
          }}
        />

        {initiatives.length > 0 && (
          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-neutral-900">
                Community initiatives
              </h3>
              <span className="text-xs font-medium text-neutral-500">
                {initiatives.length} active
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {initiatives.slice(0, 4).map((initiative) => (
                <article
                  key={initiative.id}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {initiative.category}
                    {initiative.council_district
                      ? ` · District ${initiative.council_district}`
                      : ""}
                  </p>
                  <h4 className="mt-1.5 text-sm font-bold leading-5 text-neutral-900">
                    {initiative.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-600">
                    {initiative.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
