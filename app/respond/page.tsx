"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ReportSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  district_number: number;
  created_at: string;
}

type ActionChoice = "acknowledged" | "assigned" | "resolved";

function RespondContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [recipientRole, setRecipientRole] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("Missing response token in link.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/respond?token=${encodeURIComponent(token)}`);
        const data: {
          error?: string;
          report?: ReportSummary;
          recipientRole?: string;
        } = await res.json();

        if (!res.ok || !data.report) {
          throw new Error(data.error || "Invalid or expired link.");
        }

        setReport(data.report);
        setRecipientRole(data.recipientRole || "district_office");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load report.");
      } finally {
        setLoading(false);
      }
    }

    void verifyToken();
  }, [token]);

  async function handleAction(action: ActionChoice) {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, note }),
      });

      const data: { error?: string; newStatus?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status.");
      }

      setSubmittedStatus(data.newStatus || "Updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-neutral-500 animate-pulse">Verifying official link...</p>;
  }

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs text-red-800">
        {error || "Report unavailable."}
      </div>
    );
  }

  if (submittedStatus) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-emerald-950">
          Status updated to {submittedStatus}
        </p>
        <p className="text-xs text-emerald-800">
          The resident’s live tracking page has been updated. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
      <div className="border-b border-neutral-100 pb-4">
        <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
          District {report.district_number} • {report.category}
        </span>
        <h1 className="mt-2 text-base font-extrabold text-neutral-900">{report.title}</h1>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">{report.description}</p>
        <p className="mt-2 text-[11px] text-neutral-400">
          Current status: <strong className="text-neutral-700">{report.status}</strong> • Responding as{" "}
          {recipientRole.replace("_", " ")}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="official-note" className="block text-xs font-bold text-neutral-800">
          Optional note or agency / 311 reference for resident
        </label>
        <textarea
          id="official-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Assigned to DOT street maintenance (311 #123-456)..."
          className="w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleAction("acknowledged")}
          className="rounded-xl border border-neutral-900 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
        >
          I&apos;ve got it
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleAction("assigned")}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          Assigned to...
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleAction("resolved")}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          Fixed
        </button>
      </div>
    </div>
  );
}

export default function OfficialRespondPage() {
  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-xs font-extrabold tracking-wider text-white">
            ST
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">STANCE Official Action</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              No-login constituent response
            </p>
          </div>
        </div>

        <Suspense fallback={<p className="text-xs text-neutral-500">Loading...</p>}>
          <RespondContent />
        </Suspense>
      </div>
    </main>
  );
}