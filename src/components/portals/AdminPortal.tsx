// src/components/portals/AdminPortal.tsx
"use client";

import React from "react";
import { SLAAnalytics } from "@/src/components/SLAAnalytics";
import { PredictiveHotspots } from "@/src/components/PredictiveHotspots";
import { WorkOrderWithIssue, RiskData } from "@/app/page";
import {
  ShieldCheck,
  Activity,
  AlertOctagon,
  DollarSign,
  Cpu,
} from "lucide-react";

interface AdminPortalProps {
  workOrders: WorkOrderWithIssue[];
  riskAnalytics: RiskData[];
}

export function AdminPortal({ workOrders, riskAnalytics }: AdminPortalProps) {
  // Compute key operations matrices on the fly
  const breachedOrders = workOrders.filter((w) => !w.completed_at).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Operations Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border-l-4 border-amber-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Global Operations & Risk Underwriting Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            System Overlord Access: Underwrite structural vulnerabilities, track
            contractor performance metrics, and execute system dispatches.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-amber-500" />
          V3.2-ML Engaged
        </div>
      </div>

      {/* Advanced Underwriting Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Contractor Compliance Rate
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              94.2% On-Time
            </h4>
          </div>
          <Activity className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              SLA Risk Escalations
            </p>
            <h4 className="text-xl font-black text-amber-600 mt-1">
              {breachedOrders} Delayed Work Orders
            </h4>
          </div>
          <AlertOctagon className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Projected Liquidated Penalties
            </p>
            <h4 className="text-xl font-black text-slate-900 mt-1">
              $48,250 Escrow
            </h4>
          </div>
          <DollarSign className="w-8 h-8 text-blue-600 bg-blue-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Analytics Module Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Contractor Dispatch Audit Engine
          </h3>
          <SLAAnalytics workOrders={workOrders} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Structural Asset Predictive Underwriting Index
          </h3>
          <PredictiveHotspots riskReports={riskAnalytics} />
        </div>
      </div>
    </div>
  );
}
