interface Milestone {
  stage: string;
  completed: boolean;
  date?: string;
}

interface CivicProgressTrackerProps {
  milestones: Milestone[];
}

const STAGES = [
  "Pending Review",
  "Submitted",
  "Acknowledged",
  "Assigned",
  "Resolved",
] as const;

function formatDate(date?: string): string | null {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

export function CivicProgressTracker({
  milestones,
}: CivicProgressTrackerProps) {
  const completedStages = STAGES.map((stage) => {
    const milestone = milestones.find((item) => item.stage === stage);

    return {
      stage,
      completed: milestone?.completed ?? false,
      date: formatDate(milestone?.date),
    };
  });

  const lastCompletedIndex = completedStages.reduce(
    (lastIndex, milestone, index) =>
      milestone.completed ? index : lastIndex,
    -1
  );

  return (
    <section
      className="w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      aria-label="Report progress"
    >
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-neutral-900">
          Report Progress
        </h4>
        <p className="mt-1 text-xs text-neutral-500">
          Track what happens after your report is received.
        </p>
      </div>

      <ol className="space-y-4">
        {completedStages.map((milestone, index) => {
          const isComplete = milestone.completed;
          const isCurrent =
            !isComplete &&
            index === lastCompletedIndex + 1;

          return (
            <li key={milestone.stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    isComplete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isCurrent
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-neutral-300 bg-neutral-50 text-neutral-400"
                  }`}
                  aria-label={
                    isComplete
                      ? `${milestone.stage} completed`
                      : isCurrent
                        ? `${milestone.stage} current stage`
                        : `${milestone.stage} not completed`
                  }
                >
                  {isComplete ? "✓" : index + 1}
                </div>

                {index !== completedStages.length - 1 && (
                  <div
                    className={`my-1 min-h-6 w-0.5 flex-1 ${
                      isComplete
                        ? "bg-emerald-500"
                        : "bg-neutral-200"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={`text-sm font-medium ${
                      isComplete || isCurrent
                        ? "text-neutral-900"
                        : "text-neutral-400"
                    }`}
                  >
                    {milestone.stage}
                  </p>

                  {isComplete && (
                    <span className="text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                  )}

                  {isCurrent && (
                    <span className="text-xs font-medium text-blue-700">
                      Current stage
                    </span>
                  )}
                </div>

                {milestone.date && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {milestone.date}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}