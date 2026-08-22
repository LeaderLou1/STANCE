// src/components/portals/AdminPortal.tsx
"use client";

import React from "react";
import { SLAAnalytics } from "@/src/components/SLAAnalytics";
import { PredictiveHotspots } from "@/src/components/PredictiveHotspots";
import { WorkOrderWithIssue, RiskData } from "@/app/page";
import { ShieldCheck, Activity } from "lucide-react";

interface AdminPortalProps {
  workOrders: WorkOrderWithIssue[];
  riskAnalytics: RiskData[];
}

export function AdminPortal({ workOrders, riskAnalytics }: AdminPortalProps) {
  // Compute key operations matrices on the fly
  const breachedOrders = workOrders.filter((w) => !w.completed_at).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Operations Header */}
      <div className="flex flex-col items-start justify-between gap-6 border-b border-[#9aabb5] bg-[#263b48] p-6 text-[#f3f1ec] shadow-md sm:p-8 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e8b86d]">Governance console</p>
          <h2 className="flex items-center gap-2 text-3xl font-black tracking-[-0.05em]">
            <ShieldCheck className="h-7 w-7 text-[#e8b86d]" />
            Keep the system accountable.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c4d0d3]">
            Inspect operational risk, review service performance, and maintain a reliable public record.
          </p>
        </div>
      </div>

      {/* Advanced Underwriting Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Contractor Compliance
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              N/A
            </h4>
          </div>
          <Activity className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-xl" />
        </div>
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              SLA Risk Escalations
            </p>
            <h4 className="text-xl font-black text-amber-600 mt-1">
              {breachedOrders} Delayed Work Orders
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Financial Reporting
            </p>
              <h4 className="text-xl font-black text-slate-900 mt-1">
                No financial data
            </h4>
          </div>
          <Activity className="w-8 h-8 text-slate-400 bg-slate-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Analytics Module Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Contractor Dispatch Audit Engine
          </h3>
          <SLAAnalytics workOrders={workOrders} />
        </div>
        <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Structural Asset Predictive Underwriting Index
          </h3>
          <PredictiveHotspots riskReports={riskAnalytics} />
        </div>
      </div>
    </div>
  );
}
