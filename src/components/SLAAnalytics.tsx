"use client";

import React, { useMemo } from "react"; // 🌟 Added useMemo here so the code runs perfectly!

interface WorkOrderWithIssue {
  dispatched_at: string;
  completed_at: string | null;
  assigned_contractor: string;
  issue: { title: string; urgency: string };
}

export function SLAAnalytics({
  workOrders,
}: {
  workOrders: WorkOrderWithIssue[];
}) {
  const completedOrders = workOrders.filter((wo) => wo.completed_at !== null);

  // Calculate Average Resolution Time in Hours
  const avgResolutionHours = useMemo(() => {
    if (completedOrders.length === 0) return 0;
    const totalHours = completedOrders.reduce((sum, wo) => {
      const start = new Date(wo.dispatched_at).getTime();
      const end = new Date(wo.completed_at!).getTime();
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);
    return Math.round(totalHours / completedOrders.length);
  }, [completedOrders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
      <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Average Response SLA
        </h3>
        <p className="text-3xl font-black text-slate-900 mt-1">
          {avgResolutionHours > 0 ? `${avgResolutionHours} Hours` : "N/A"}
        </p>
        <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
          Target baseline standard: Under 24 Hours
        </span>
      </div>

      <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Contractor Fulfillment Rate
        </h3>
        <p className="text-3xl font-black text-slate-900 mt-1">
          {workOrders.length > 0
            ? `${Math.round((completedOrders.length / workOrders.length) * 100)}%`
            : "N/A"}
        </p>
        <span className="text-[11px] text-slate-500 mt-1 block">
          Total dispatched tickets: {workOrders.length}
        </span>
      </div>
    </div>
  );
}
