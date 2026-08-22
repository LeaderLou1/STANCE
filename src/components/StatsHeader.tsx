import React from "react";
import { ClipboardList, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface StatsProps {
  stats: {
    total: number;
    inProgress: number;
    resolved: number;
    rate: number;
  };
}

export function StatsHeader({ stats }: StatsProps) {
  return (
    <section className="mb-8 grid grid-cols-2 gap-px overflow-hidden border border-[#cbd5cc] bg-[#cbd5cc] sm:grid-cols-4">
      <div className="flex items-center gap-3 bg-[#fffefa] p-4 sm:p-5">
        <div className="rounded-lg bg-[#e8eee9] p-2.5 text-[#2f7d5b]"><ClipboardList className="h-5 w-5" /></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Total Reports
          </p>
          <h4 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17211d]">{stats.total}</h4>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[#fffefa] p-4 sm:p-5">
        <div className="rounded-lg bg-[#f8ecd9] p-2.5 text-[#b7732d]">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            In Progress
          </p>
          <h4 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17211d]">
            {stats.inProgress}
          </h4>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[#fffefa] p-4 sm:p-5">
        <div className="rounded-lg bg-[#e8eee9] p-2.5 text-[#2f7d5b]">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Resolved Problems
          </p>
          <h4 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17211d]">
            {stats.resolved}
          </h4>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[#fffefa] p-4 sm:p-5">
        <div className="rounded-lg bg-[#e8eee9] p-2.5 text-[#2f7d5b]">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Resolution Index
          </p>
          <h4 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#2f7d5b]">
            {stats.rate}%
          </h4>
        </div>
      </div>
    </section>
  );
}
