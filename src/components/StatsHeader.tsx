
"use client";

import {
  ClipboardList,
  Clock,
  CheckCircle2,
  FileClock,
} from "lucide-react";

interface StatsProps {
  stats: {
    total: number;
    inProgress: number;
    resolved: number;
    awaitingReview: number;
  };
}

export function StatsHeader({ stats }: StatsProps) {
  const cards = [
    {
      label: "Total Reports",
      value: stats.total,
      icon: ClipboardList,
      iconStyle: "bg-[#e8eee9] text-[#2f7d5b]",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      iconStyle: "bg-[#f8ecd9] text-[#b7732d]",
    },
    {
      label: "Resolved Reports",
      value: stats.resolved,
      icon: CheckCircle2,
      iconStyle: "bg-[#e8eee9] text-[#2f7d5b]",
    },
    {
      label: "Awaiting Review",
      value: stats.awaitingReview,
      icon: FileClock,
      iconStyle: "bg-[#f0eee8] text-[#786b4c]",
    },
  ];

  return (
    <section
      aria-label="Report statistics"
      className="mb-6 grid w-full min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#cbd5cc] bg-[#cbd5cc] sm:mb-8 sm:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            aria-label={`${card.label}: ${card.value}`}
            className="flex min-w-0 items-center gap-2 bg-[#fffefa] p-3 sm:gap-3 sm:p-5"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${card.iconStyle}`}
            >
              <Icon
                aria-hidden="true"
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words text-[9px] font-bold uppercase leading-4 tracking-[0.08em] text-[#647168] sm:text-[10px] sm:tracking-[0.12em]">
                {card.label}
              </p>

              <p className="mt-1 text-xl font-black tabular-nums tracking-tight text-[#17211d] sm:text-2xl">
                {Number.isFinite(card.value)
                  ? card.value.toLocaleString()
                  : "—"}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
