
"use client";

import React from "react";
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
      className="mb-8 grid grid-cols-2 gap-px overflow-hidden border border-[#cbd5cc] bg-[#cbd5cc] sm:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="flex items-center gap-3 bg-[#fffefa] p-4 sm:p-5"
          >
            <div className={`rounded-lg p-2.5 ${card.iconStyle}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
                {card.label}
              </p>

              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17211d]">
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
