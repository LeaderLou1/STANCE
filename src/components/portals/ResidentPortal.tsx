
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

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function getStatusStyle(status: string): StatusStyle {
  switch (normalizeStatus(status)) {
    case "pending review":
      return {
        label: "Pending review",
        description:
          "Your report is awaiting review. It has not been delivered to an official.",
        className: "border-amber-200 bg-amber-50 text-amber-800",
        icon: Clock3,
      };

    case "submitted":
    case "dispatched":
      return {
        label: "Submitted",
        description:
          "Your approved report has been delivered for official attention.",
        className: "border-blue-200 bg-blue-50 text-blue-800",
        icon: FileText,
      };

    case "acknowledged":
    case "i've got it":
    case "ive got it":
      return {
        label: "Acknowledged",
        description:
          "An official has acknowledged your report.",
        className: "border-violet-200 bg-violet-50 text-violet-800",
        icon: UserCheck,
      };

    case "assigned":
      return {
        label: "Assigned",
        description:
          "Responsibility for this issue has been assigned.",
        className: "border-indigo-200 bg-indigo-50 text-indigo-800",
        icon: Activity,
      };

    case "in progress":
    case "pending resolution":
      return {
        label: "In progress",
        description:
          "Work is underway to address this issue.",
        className: "border-cyan-200 bg-cyan-50 text-cyan-800",
        icon: Activity,
      };

    case "resolved":
      return {
        label: "Marked resolved",
        description:
          "This issue has been marked as resolved. You can confirm whether the problem was actually fixed.",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
        icon: CheckCircle2,
      };

    case "rejected":
      return {
        label: "Not approved",
        description:
          "This report was not approved for delivery. Review the report details for more information.",
        className: "border-rose-200 bg-rose-50 text-rose-800",
        icon: AlertCircle,
      };

    default:
      return {
        label: status.trim() || "Status unavailable",
        description:
          "The latest report status is not available. Check the report details for more information.",
        className: "border-neutral-200 bg-neutral-100 text-neutral-700",
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
  const activeStatuses = [
    "submitted",
    "dispatched",
    "acknowledged",
    "i've got it",
    "ive got it",
    "assigned",
    "in progress",
    "pending resolution",
  ];

  return {
    total: reports.length,

    pending: reports.filter(
      (report) =>
        normalizeStatus(report.status) === "pending review"
    ).length,

    active: reports.filter((report) =>
      activeStatuses.includes(normalizeStatus(report.status))
    ).length,

    resolved: reports.filter(
      (report) =>
        normalizeStatus(report.status) === "resolved"
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

  const sortedReports = [...reports].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();

    return (
      (Number.isFinite(dateB) ? dateB : 0) -
      (Number.isFinite(dateA) ? dateA : 0)
    );
  });

  return (
    <section
      aria-label="Resident dashboard"
      className="w-full min-w-0 space-y-5 sm:space-y-6"
    >
      {/* Dashboard header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#d8e3dc] bg-[#f2f7f2] p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-600/5 blur-3xl"
        />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 max-w-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-800">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Your community
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">
              Your voice. Your reports. Your progress.
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600">
              Keep track of neighborhood issues you've reported,
              see official updates, and let us know when a problem
              has actually been fixed.
            </p>
          </div>

          {onCreateReport && (
            <button
              type="button"
              onClick={onCreateReport}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#245b43] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#194a35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43] sm:w-auto"
            >
              <Plus
                aria-hidden="true"
                className="h-4 w-4"
              />
              Report an issue
            </button>
          )}
        </div>
      </div>

      {/* Summary metrics */}
      <div
        aria-label="Your report statistics"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
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
          description="Submitted or in progress"
          iconClass="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          label="Marked resolved"
          value={summary.resolved}
          icon={CheckCircle2}
          description="Marked as resolved"
          iconClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Reports section */}
      <section
        aria-labelledby="resident-reports-heading"
        className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-2 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
          <div>
            <h3
              id="resident-reports-heading"
              className="text-lg font-extrabold tracking-tight text-neutral-900"
            >
              Your reports
            </h3>

            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Follow each report from review through official response.
            </p>
          </div>

          <span
            className="text-xs font-semibold text-neutral-500"
            aria-live="polite"
          >
            {reports.length}{" "}
            {reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        {sortedReports.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center sm:px-6 sm:py-14">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileText
                aria-hidden="true"
                className="h-8 w-8"
              />
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
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#245b43] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#194a35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43] sm:w-auto"
              >
                <Plus
                  aria-hidden="true"
                  className="h-4 w-4"
                />
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
                normalizeStatus(report.status) === "resolved";

              return (
                <article
                  key={report.id}
                  aria-labelledby={`report-title-${report.id}`}
                  className="min-w-0 p-4 transition hover:bg-neutral-50/70 sm:p-6"
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                    {/* Report photo */}
                    <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:h-24 sm:w-28">
                      {report.photo_url ? (
                        <img
                          src={report.photo_url}
                          alt={`Photo for ${report.title}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-neutral-400"
                          aria-label="No report photo"
                        >
                          <Camera
                            aria-hidden="true"
                            className="h-7 w-7"
                          />
                        </div>
                      )}
                    </div>

                    {/* Report details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-full break-words rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                          {report.category}
                        </span>

                        <time
                          dateTime={report.created_at}
                          className="text-xs text-neutral-500"
                        >
                          {formatDate(report.created_at)}
                        </time>
                      </div>

                      <h4
                        id={`report-title-${report.id}`}
                        className="mt-2 break-words text-base font-bold leading-6 text-neutral-900"
                      >
                        {report.title}
                      </h4>

                      {report.description && (
                        <p className="mt-1 line-clamp-3 break-words text-sm leading-5 text-neutral-600">
                          {report.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
                        <span className="inline-flex min-w-0 items-start gap-1">
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          />
                          <span className="break-words">
                            {report.location_label ||
                              `NYC Council District ${report.district_number}`}
                          </span>
                        </span>

                        <span className="break-all font-mono">
                          Report #{report.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {/* Status and navigation */}
                    <div className="flex min-w-0 flex-col items-start gap-3 sm:w-40 sm:shrink-0 sm:items-end">
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${status.className}`}
                      >
                        <StatusIcon
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className="break-words">
                          {status.label}
                        </span>
                      </span>

                      {onViewReport && (
                        <button
                          type="button"
                          onClick={() => onViewReport(report.id)}
                          aria-label={`View report: ${report.title}`}
                          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#245b43] transition hover:text-[#194a35] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43]"
                        >
                          View report
                          <ArrowRight
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Official response */}
                  {report.official_response && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <MessageSquareText
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                        Official update
                      </div>

                      <p className="mt-2 break-words text-sm leading-6 text-blue-950">
                        {report.official_response}
                      </p>

                      {report.updated_at && (
                        <p className="mt-2 text-[11px] text-blue-700">
                          Updated {formatDate(report.updated_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status explanation and resident confirmation */}
                  <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 text-xs leading-5 text-neutral-500">
                      {status.description}
                    </p>

                    {isResolved && onConfirmResolution && (
                      <button
                        type="button"
                        onClick={() =>
                          onConfirmResolution(report.id)
                        }
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto"
                      >
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        Confirm it's fixed
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust and transparency */}
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#245b43]"
        />

        <div className="min-w-0">
          <p className="text-sm font-bold text-neutral-800">
            Your report stays yours.
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-600">
            A report is not sent to an official until you approve
            its delivery. STANCE keeps your report status visible
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
    <article
      aria-label={`${label}: ${value}`}
      className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-5"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 break-words text-[9px] font-bold uppercase leading-4 tracking-wider text-neutral-500 sm:text-[10px]">
          {label}
        </p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${iconClass}`}
        >
          <Icon
            aria-hidden="true"
            className="h-4 w-4"
          />
        </span>
      </div>

      <p className="mt-3 text-2xl font-black tabular-nums tracking-tight text-neutral-900 sm:text-3xl">
        {Number.isFinite(value) ? value.toLocaleString() : "—"}
      </p>

      <p className="mt-1 break-words text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </article>
  );
}
