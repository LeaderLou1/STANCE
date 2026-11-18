import React from 'react';

interface Milestone {
  stage: string;
  completed: boolean;
  date?: string;
}

export function CivicProgressTracker({ milestones }: { milestones: Milestone[] }) {
  const stages = ['Submitted', 'Acknowledged', 'Dispatched', 'Resolved'];

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
      <h4 className="text-sm font-semibold text-neutral-900 mb-3">Issue Lifecycle Tracker</h4>
      <div className="flex items-center justify-between relative">
        {stages.map((stage, idx) => {
          const match = milestones.find((m) => m.stage === stage);
          const isComplete = match?.completed;

          return (
            <div key={stage} className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isComplete ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-400 border border-neutral-300'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${isComplete ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}