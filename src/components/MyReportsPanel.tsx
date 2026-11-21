import React from "react";
import { CivicProgressTracker } from "./CivicProgressTracker";

type ReportRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  reporter_id?: string | null;
  resolution_notes?: string | null;
};

const STAGES = ["Submitted", "Acknowledged", "Dispatched", "Resolved"];

// Assumed mapping from your status values to the tracker's four stages.
function stagesDone(status: string): number {
  switch (status) {
    case "Resolved": return 4;
    case "In Progress":
    case "Dispatched": return 3;
    case "Acknowledged": return 2;
    default: return 1;
  }
}

export function MyReportsPanel({
  issues,
  userId,
}: {
  issues: ReportRow[];
  userId: string | null;
}) {
  const mine = userId ? issues.filter((i) => i.reporter_id === userId).slice(0, 5) : [];

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">Your reports</h2>
      {!userId ? (
        <p className="text-xs text-neutral-500">Sign in to track the reports you submit.</p>
      ) : mine.length === 0 ? (
        <p className="text-xs text-neutral-500">Reports you submit will appear here with their status.</p>
      ) : (
        mine.map((r) => {
          const done = stagesDone(r.status);
          return (
            <div key={r.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-900">{r.title}</p>
                <p className="shrink-0 text-[11px] text-neutral-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <CivicProgressTracker
                milestones={STAGES.map((stage, i) => ({ stage, completed: i < done }))}
              />
              {r.resolution_notes && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Official response: {r.resolution_notes}
                </p>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}