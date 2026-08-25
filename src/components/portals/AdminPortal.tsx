"use client";

import React, { useMemo } from "react";
import { SLAAnalytics } from "@/src/components/SLAAnalytics";
import { PredictiveHotspots } from "@/src/components/PredictiveHotspots";
import { WorkOrderWithIssue, RiskData } from "@/app/page";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileCheck,
} from "lucide-react";

interface AdminPortalProps {
  workOrders: WorkOrderWithIssue[];
  riskAnalytics: RiskData[];
}

export function AdminPortal({ workOrders = [], riskAnalytics = [] }: AdminPortalProps) {
  // Compute key stats on the fly
  const metrics = useMemo(() => {
    const totalOrders = workOrders.length;
    const pendingOrders = workOrders.filter((w) => !w.completed_at);
    const completedOrders = workOrders.filter((w) => w.completed_at);

    // On-time completion rate (%)
    const complianceRate = totalOrders > 0 
      ? Math.round((completedOrders.length / totalOrders) * 100) 
      : 100;

    // High risk neighborhoods needing quick attention
    const highRiskHotspots = riskAnalytics.filter(
      (r) => r.calculated_risk_score >= 0.7 || r.aggregate_community_urgency >= 3
    ).length;

    // Total past issues fixed across neighborhoods
    const totalHistoricalFailures = riskAnalytics.reduce(
      (sum, item) => sum + (item.historical_failure_count || 0),
      0
    );

    return {
      totalOrders,
      pendingOrdersCount: pendingOrders.length,
      completedOrdersCount: completedOrders.length,
      complianceRate,
      highRiskHotspots,
      totalHistoricalFailures,
    };
  }, [workOrders, riskAnalytics]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden border border-[#9aabb5] bg-[#263b48] p-6 text-[#f3f1ec] shadow-md sm:p-8 rounded-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#e8b86d]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b86d]/30 bg-[#e8b86d]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8b86d]">
                <ShieldCheck className="h-3 w-3" /> City Overview
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c4d0d3]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Updates Active
              </span>
            </div>
            <h2 className="flex items-center gap-2.5 text-3xl font-black tracking-[-0.04em] text-[#f3f1ec] sm:text-4xl">
              Keep city promises on track.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c4d0d3]">
              Track repairs, check how quickly work gets done, and spot neighborhood issues before they get worse.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#3e5666] bg-[#1d2d37] px-3.5 py-2 text-xs font-semibold text-[#c4d0d3]">
            <FileCheck className="h-4 w-4 text-[#e8b86d]" />
            <span>Audit Trail: <strong>#NYC-LIVE-2026</strong></span>
          </div>
        </div>
      </div>

      {/* Everyday KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* On-Time Completion Rate */}
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 rounded-xl shadow-2xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Work Done On Time
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {metrics.complianceRate}%
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics.completedOrdersCount} of {metrics.totalOrders} repair jobs finished
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Jobs */}
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 rounded-xl shadow-2xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Jobs Needing Attention
            </p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">
              {metrics.pendingOrdersCount} Pending Jobs
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Waiting for crew assignment or review
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Neighborhood Priority Zones */}
        <div className="flex items-center justify-between border border-[#cbd5cc] bg-[#fffefa] p-5 rounded-xl shadow-2xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Priority Neighborhoods
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {metrics.highRiskHotspots} High-Priority Areas
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics.totalHistoricalFailures} reported issues recorded
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contractor Tracker */}
        <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Crew Response Times
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                See how fast repair teams finish reported tasks against target deadines
              </p>
            </div>
          </div>
          <SLAAnalytics workOrders={workOrders} />
        </div>

        {/* Predictive Hotspot Map */}
        <div className="border border-[#cbd5cc] bg-[#fffefa] p-5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Neighborhood Problem Detector
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Spot areas where infrastructure like streetlights or pavement needs early maintenance
              </p>
            </div>
          </div>
          <PredictiveHotspots riskReports={riskAnalytics} />
        </div>
      </div>
    </div>
  );
}