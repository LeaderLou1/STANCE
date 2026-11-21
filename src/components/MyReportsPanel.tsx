"use client";

import React from "react";
import { CivicProgressTracker } from "./CivicProgressTracker";

type ReportRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  reporter_id?: string | null;
  status_token: string;
  resolution_notes?: string | null;
};

export function MyReportsPanel({
  issues,
  userId,
}: {
  issues: ReportRow[];
  userId: string | null;
}) {
  const mine = userId ? issues.filter((i) => i.reporter_id === userId).slice(0, 5) : [];

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">Your reports</h2>
      {!userId ? (
        <p className="text-xs text-neutral-500">Sign in to track the reports you submit.</p>
      ) : mine.length === 0 ? (
        <p className="text-xs text-neutral-500">Reports you submit will appear here with live official status tracking.</p>
      ) : (
        <div className="space-y-4">
          {mine.map((r) => (
            <div key={r.id} className="space-y-2 border-b border-neutral-100 pb-4 last:border-none last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold text-neutral-900">{r.title}</p>
                <p className="shrink-0 text-[10px] text-neutral-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Passes the live secure status token into CivicProgressTracker */}
              <CivicProgressTracker statusToken={r.status_token} />

              {r.resolution_notes && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Official response: {r.resolution_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}