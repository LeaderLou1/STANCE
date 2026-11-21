
"use client";

import { CivicProgressTracker } from "./CivicProgressTracker";

type ReportRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  reporter_id?: string | null;
  resolution_notes?: string | null;
};

const STAGES = [
  "Pending Review",
  "Submitted",
  "Acknowledged",
  "Assigned",
  "Resolved",
];

function stagesDone(status: string): number {
  switch (status) {
    case "Pending Review":
      return 0;

    case "Submitted":
    case "Dispatched":
      return 2;

    case "Acknowledged":
      return 3;

    case "In Progress":
    case "Pending Resolution":
      return 4;

    case "Resolved":
      return 5;

    default:
      // Unknown statuses must not imply progress.
      return 0;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MyReportsPanel({
  issues,
  userId,
}: {
  issues: ReportRow[];
  userId: string | null;
}) {
  const mine = userId
    ? issues
        .filter((issue) => issue.reporter_id === userId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 5)
    : [];

  return (
    <section
      aria-labelledby="my-reports-heading"
      className="w-full min-w-0 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div>
        <h2
          id="my-reports-heading"
          className="text-base font-extrabold tracking-tight text-neutral-900"
        >
          Your reports
        </h2>

        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Follow the progress of reports associated with your account.
        </p>
      </div>

      {!userId ? (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-sm leading-6 text-neutral-600">
            Sign in to track the reports you submit.
          </p>
        </div>
      ) : mine.length === 0 ? (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-sm leading-6 text-neutral-600">
            Reports you submit will appear here with their status.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {mine.map((report) => {
            const done = stagesDone(report.status);

            return (
              <article
                key={report.id}
                aria-label={`Report: ${report.title}`}
                className="min-w-0 space-y-3 border-b border-neutral-100 pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <h3 className="min-w-0 break-words text-sm font-bold leading-5 text-neutral-900">
                    {report.title}
                  </h3>

                  <time
                    dateTime={report.created_at}
                    className="shrink-0 text-xs text-neutral-500"
                  >
                    {formatDate(report.created_at)}
                  </time>
                </div>

                <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 sm:p-4">
                  <CivicProgressTracker
                    milestones={STAGES.map((stage, index) => ({
                      stage,
                      completed: index < done,
                    }))}
                  />
                </div>

                {report.resolution_notes && (
                  <div
                    aria-label="Official response"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <p className="text-xs font-bold text-emerald-900">
                      Official response
                    </p>

                    <p className="mt-1 break-words text-sm leading-6 text-emerald-800">
                      {report.resolution_notes}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
