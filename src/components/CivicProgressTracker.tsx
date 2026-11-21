"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

interface ResponseLog {
  id: string;
  action_type: "acknowledged" | "assigned" | "resolved";
  note: string | null;
  created_at: string;
}

interface ReportDetails {
  id: string;
  title: string;
  status: string;
  created_at: string;
  district_number: number;
}

interface CivicProgressTrackerProps {
  statusToken: string;
}

export function CivicProgressTracker({ statusToken }: CivicProgressTrackerProps) {
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [responses, setResponses] = useState<ResponseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReportStatus() {
      if (!statusToken) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch report by secure status_token
        const { data: reportData, error: reportError } = await supabase
          .from("reports")
          .select("id, title, status, created_at, district_number")
          .eq("status_token", statusToken)
          .single();

        if (reportError || !reportData) {
          throw new Error("Report not found or invalid status token.");
        }

        setReport(reportData);

        // 2. Fetch live responses associated with this report ID
        const { data: responseData, error: responseError } = await supabase
          .from("responses")
          .select("id, action_type, note, created_at")
          .eq("report_id", reportData.id)
          .order("created_at", { ascending: true });

        if (responseError) {
          throw responseError;
        }

        setResponses(responseData || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load report status.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void fetchReportStatus();
  }, [statusToken]);

  if (loading) {
    return <div className="p-6 text-xs text-neutral-500 animate-pulse">Loading live tracking status...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
        {error || "Report could not be found."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-neutral-900">{report.title}</h3>
          <p className="text-[11px] text-neutral-500">District {report.district_number} • Submitted {new Date(report.created_at).toLocaleDateString()}</p>
        </div>
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-bold text-white">
          {report.status}
        </span>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-neutral-700">Official Response History</h4>
        {responses.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Awaiting initial official response from district representatives.</p>
        ) : (
          <div className="space-y-2">
            {responses.map((resp) => (
              <div key={resp.id} className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3 border border-neutral-100 text-xs">
                <span className="font-bold text-neutral-900 uppercase tracking-wider text-[10px] bg-neutral-200 px-2 py-0.5 rounded">
                  {resp.action_type}
                </span>
                <div className="flex-1">
                  <p className="text-neutral-700">{resp.note || "No additional notes provided by official."}</p>
                  <span className="text-[10px] text-neutral-400">{new Date(resp.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}