
"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Plus,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Camera,
} from "lucide-react";

export interface ResidentReport {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  district_number: number;
  lat: number;
  lng: number;
  photo_url?: string | null;
  status: string;
  created_at: string;

  // Optional fields for official updates as the response workflow develops.
  official_response?: string | null;
  updated_at?: string | null;
  location_label?: string | null;
}

interface ResidentPortalProps {
  reports?: ResidentReport[];
  onCreateReport?: () => void;
  onViewReport?: (reportId: string) => void;
  onConfirmResolution?: (reportId: string) => void;
}

type StatusStyle = {
  label: string;
  description: string;
  className: string;
  icon: React.ElementType;
};

function getStatusStyle(status: string): StatusStyle {
  switch (status.toLowerCase()) {
    case "pending review":
      return {
        label: "Pending review",
        description: "Your report is awaiting review. It has not been delivered to an official.",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock3,
      };

    case "submitted":
      return {
        label: "Submitted",
        description: "Your approved report has been submitted for official attention.",
        className: "bg-blue-50 text-blue-800 border-blue-200",
        icon: FileText,
      };

    case "acknowledged":
    case "i've got it":
    case "ive got it":
      return {
        label: "Acknowledged",
        description: "An official has acknowledged your report.",
        className: "bg-violet-50 text-violet-800 border-violet-200",
        icon: UserCheck,
      };

    case "assigned":
      return {
        label: "Assigned",
        description: "Responsibility for this issue has been assigned.",
        className: "bg-indigo-50 text-indigo-800 border-indigo-200",
        icon: Activity,
      };

    case "in progress":
      return {
        label: "In progress",
        description: "Work is underway to address this issue.",
        className: "bg-cyan-50 text-cyan-800 border-cyan-200",
        icon: Activity,
      };

    case "resolved":
      return {
        label: "Marked resolved",
        description: "The issue has been marked as resolved. Please confirm whether it was actually fixed.",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: CheckCircle2,
      };

    case "rejected":
      return {
        label: "Not approved",
        description: "This report was not approved for delivery.",
        className: "bg-rose-50 text-rose-800 border-rose-200",
        icon: AlertCircle,
      };

    default:
      return {
        label: status || "Status unavailable",
        description: "Check this report for the latest information.",
        className: "bg-neutral-100 text-neutral-700 border-neutral-200",
        icon: FileText,
      };
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSummary(reports: ResidentReport[]) {
  return {
    total: reports.length,
    pending: reports.filter(
      (report) => report.status.toLowerCase() === "pending review",
    ).length,
    active: reports.filter((report) =>
      ["submitted", "acknowledged", "assigned", "i've got it", "ive got it", "in progress"].includes(
        report.status.toLowerCase(),
      ),
    ).length,
    resolved: reports.filter(
      (report) => report.status.toLowerCase() === "resolved",
    ).length,
  };
}

export function ResidentPortal({
  reports = [],
  onCreateReport,
  onViewReport,
  onConfirmResolution,
}: ResidentPortalProps) {
  const summary = getSummary(reports);

  const sortedReports = [...reports].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  );

  return (
    <section className="space-y-6">
      {/* Dashboard header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#d8e3dc] bg-[#f2f7f2] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-600/5 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your community
              </span>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
              Your voice. Your reports. Your progress.
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600">
              Keep track of the neighborhood issues you've reported,
              see official updates, and let us know when a problem
              has actually been fixed.
            </p>
          </div>

          {onCreateReport && (
            <button
              type="button"
              onClick={onCreateReport}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#245b43] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#194a35] focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Report an issue
            </button>
          )}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Total reports"
          value={summary.total}
          icon={FileText}
          description="Issues you've reported"
          iconClass="bg-neutral-100 text-neutral-700"
        />

        <SummaryCard
          label="Under review"
          value={summary.pending}
          icon={Clock3}
          description="Awaiting review"
          iconClass="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          label="Being addressed"
          value={summary.active}
          icon={Activity}
          description="Submitted or acknowledged"
          iconClass="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          label="Marked resolved"
          value={summary.resolved}
          icon={CheckCircle2}
          description="Awaiting your confirmation"
          iconClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Reports section */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Your reports
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Follow each report from review through official response.
            </p>
          </div>

          <span className="text-xs font-semibold text-neutral-500">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        {sortedReports.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileText className="h-8 w-8" />
            </div>

            <h4 className="text-lg font-bold text-neutral-900">
              No reports yet
            </h4>

            <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              When you report a neighborhood issue, you'll be able
              to track its review, delivery, and official response here.
            </p>

            {onCreateReport && (
              <button
                type="button"
                onClick={onCreateReport}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#245b43] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#194a35]"
              >
                <Plus className="h-4 w-4" />
                Create your first report
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {sortedReports.map((report) => {
              const status = getStatusStyle(report.status);
              const StatusIcon = status.icon;
              const isResolved =
                report.status.toLowerCase() === "resolved";

              return (
                <article
                  key={report.id}
                  className="p-5 transition hover:bg-neutral-50/70 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Report photo */}
                    {report.photo_url ? (
                      <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:h-24 sm:w-28">
                        <img
                          src={report.photo_url}
                          alt={`Photo for ${report.title}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 sm:h-24 sm:w-28">
                        <Camera className="h-7 w-7" />
                      </div>
                    )}

                    {/* Report details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                          {report.category}
                        </span>

                        <span className="text-xs text-neutral-400">
                          {formatDate(report.created_at)}
                        </span>
                      </div>

                      <h4 className="mt-2 text-base font-bold text-neutral-900">
                        {report.title}
                      </h4>

                      {report.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-600">
                          {report.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {report.location_label ||
                            `NYC Council District ${report.district_number}`}
                        </span>

                        <span className="font-mono">
                          Report #{report.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>

                      {onViewReport && (
                        <button
                          type="button"
                          onClick={() => onViewReport(report.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#245b43] transition hover:text-[#194a35]"
                        >
                          View report
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Official response */}
                  {report.official_response && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <MessageSquareText className="h-4 w-4" />
                        Official update
                      </div>

                      <p className="mt-2 text-sm leading-6 text-blue-950">
                        {report.official_response}
                      </p>

                      {report.updated_at && (
                        <p className="mt-2 text-[11px] text-blue-700">
                          Updated {formatDate(report.updated_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status explanation */}
                  <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-xs leading-5 text-neutral-500">
                      {status.description}
                    </p>

                    {isResolved && onConfirmResolution && (
                      <button
                        type="button"
                        onClick={() =>
                          onConfirmResolution(report.id)
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm it's fixed
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust and transparency note */}
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#245b43]" />

        <div>
          <p className="text-sm font-bold text-neutral-800">
            Your report stays yours.
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">
            A report is not sent to an official until you approve
            its delivery. STANCE keeps the report status visible
            so you can follow what happens next.
          </p>
        </div>
      </div>
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  description: string;
  icon: React.ElementType;
  iconClass: string;
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <span className={`rounded-lg p-2 ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {description}
      </p>
    </div>
  );
}
