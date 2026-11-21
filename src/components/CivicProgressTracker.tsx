
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
    const milestone = milestones.find(
      (item) => item.stage === stage
    );

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

  const currentIndex = completedStages.findIndex(
    (milestone, index) =>
      !milestone.completed && index === lastCompletedIndex + 1
  );

  const completedCount = completedStages.filter(
    (milestone) => milestone.completed
  ).length;

  return (
    <section
      className="w-full min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="civic-progress-heading"
    >
      <div className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            id="civic-progress-heading"
            className="text-sm font-semibold text-neutral-900"
          >
            Report Progress
          </h4>

          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-neutral-600">
            {completedCount} of {STAGES.length} stages
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Track what happens after your report is received.
        </p>
      </div>

      <ol
        className="space-y-3 sm:space-y-4"
        aria-label="Report progress milestones"
      >
        {completedStages.map((milestone, index) => {
          const isComplete = milestone.completed;
          const isCurrent = index === currentIndex;

          return (
            <li
              key={milestone.stage}
              className="flex min-w-0 gap-3"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex shrink-0 flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${
                    isComplete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isCurrent
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-neutral-300 bg-neutral-50 text-neutral-400"
                  }`}
                  aria-hidden="true"
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
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p
                    className={`break-words text-sm font-semibold ${
                      isComplete || isCurrent
                        ? "text-neutral-900"
                        : "text-neutral-400"
                    }`}
                  >
                    {milestone.stage}
                  </p>

                  {isComplete ? (
                    <span className="shrink-0 text-xs font-semibold text-emerald-700">
                      Completed
                    </span>
                  ) : isCurrent ? (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      Current stage
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-neutral-400">
                      Upcoming
                    </span>
                  )}
                </div>

                {milestone.date && (
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
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
