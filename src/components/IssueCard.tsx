"use client";

import React from "react";
import {
  ArrowUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { UserRole } from "@/src/types";
import { DiscussionBoard } from "./DiscussionBoard";

interface IssueCardIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency?: string | null;
  upvotes: number;
  status: string;
  zip_code?: string | null;
  resolution_proof_url?: string | null;
  resolution_notes?: string | null;
  representative?: {
    name?: string | null;
    party?: string | null;
    district?: string | number | null;
  } | null;
}

interface IssueCardProps<T extends IssueCardIssue> {
  issue: T;
  currentRole: UserRole;
  onUpvote: (id: string, votes: number) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onStartEditing: (issue: T) => void;
  onDelete: (id: string) => void;
  onAddReply: (id: string) => void;
  onDispatchWorkOrder?: (id: string) => void;
}

export function IssueCard<T extends IssueCardIssue>({
  issue,
  currentRole,
  onUpvote,
  onUpdateStatus,
  onStartEditing,
  onDelete,
  onAddReply,
  onDispatchWorkOrder,
}: IssueCardProps<T>) {
  return (
    <div className="group flex flex-col gap-5 border border-[#cbd5cc] bg-[#fffefa] p-5 transition hover:-translate-y-0.5 hover:border-[#91aa99] hover:shadow-[0_12px_30px_rgba(23,33,29,0.08)] sm:flex-row sm:p-6">
      {/* UPVOTE COLUMN */}
      <div className="flex items-center justify-start sm:flex-col">
        <button
          type="button"
          onClick={() => onUpvote(issue.id, issue.upvotes)}
          className="flex h-16 w-12 flex-col items-center justify-start border border-[#cbd5cc] bg-[#f3f1ec] p-3 transition hover:border-[#91aa99] hover:bg-[#e8eee9]"
        >
          <ArrowUp className="h-4 w-4 text-[#647168] transition-all group-hover:-translate-y-0.5 group-hover:text-[#2f7d5b]" />

          <span className="mt-1 text-sm font-bold text-[#17211d]">
            {issue.upvotes}
          </span>
        </button>
      </div>

      {/* MAIN DATA CONTAINER */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          {/* HEADER TAGS */}
          <div className="flex items-center justify-between">
            <span className="border border-[#cbd5cc] bg-[#f3f1ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#647168]">
              {issue.category}
            </span>

            <span
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                issue.urgency === "Critical Danger"
                  ? "bg-[#f8dfdc] text-[#a33d2f]"
                  : issue.urgency === "High Breakdown"
                    ? "bg-[#f8ecd9] text-[#a36327]"
                    : issue.urgency === "Medium Baseline"
                      ? "bg-[#f8ecd9] text-[#a36327]"
                      : "bg-[#e8eee9] text-[#647168]"
              }`}
            >
              {issue.urgency || "Medium Baseline"}
            </span>
          </div>

          {/* CONTENT FIELD BLOCK */}
          <div className="mt-3 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-black tracking-[-0.025em] text-[#17211d]">
                {issue.title}
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#647168]">
                {issue.description}
              </p>

              {/* RESOLUTION PROOF */}
              {issue.resolution_proof_url && (
                <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(
                    issue.resolution_proof_url,
                  ) ? (
                    <video
                      src={issue.resolution_proof_url}
                      controls
                      className="max-h-72 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={issue.resolution_proof_url}
                      alt={`Evidence for ${issue.title}`}
                      className="max-h-72 w-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* RESOLUTION NOTES */}
              {issue.resolution_notes && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                  <strong className="mb-1 block uppercase tracking-wider text-emerald-800">
                    Official Response:
                  </strong>

                  {issue.resolution_notes}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="ml-4 flex max-w-60 flex-wrap justify-end gap-2">
              {/* REPRESENTATIVE WORK ORDER */}
              {currentRole === "representative" &&
                onDispatchWorkOrder && (
                  <button
                    type="button"
                    onClick={() =>
                      onDispatchWorkOrder(issue.id)
                    }
                    className="flex items-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Dispatch Crew
                  </button>
                )}

              {/* REPRESENTATIVE REPLY */}
              {currentRole === "representative" && (
                <button
                  type="button"
                  onClick={() => onAddReply(issue.id)}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-[#0f5132] transition hover:bg-emerald-100"
                >
                  Official Reply
                </button>
              )}

              {/* RESIDENT ACTIONS */}
              {currentRole === "resident" && (
                <>
                  <button
                    type="button"
                    onClick={() => onStartEditing(issue)}
                    className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    Edit Request
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(issue.id)}
                    className="rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </>
              )}

              {/* ADMIN ACTION */}
              {currentRole === "admin" && (
                <button
                  type="button"
                  onClick={() => onDelete(issue.id)}
                  className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                >
                  Admin Purge
                </button>
              )}
            </div>
          </div>
        </div>

        {/* METRICS / STATUS */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />

              {issue.representative?.name ? (
                <span>
                  {issue.representative.name}{" "}
                  <span className="font-normal text-gray-400">
                    (
                    {issue.representative.party ||
                      "Ind."}{" "}
                    - District{" "}
                    {issue.representative.district})
                  </span>
                </span>
              ) : (
                <span className="italic text-gray-400">
                  Auto-assigning Representative...
                </span>
              )}
            </div>

            <span className="text-gray-300">|</span>

            <span>
              District Zone:{" "}
              <strong className="text-gray-700">
                {issue.zip_code || "—"}
              </strong>
            </span>
          </div>

          {/* STATUS */}
          <div>
            {currentRole !== "resident" ? (
              <select
                value={issue.status}
                onChange={(event) =>
                  onUpdateStatus(
                    issue.id,
                    event.target.value,
                  )
                }
                className="cursor-pointer rounded-lg border bg-gray-50 p-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#0f5132]"
              >
                <option value="Submitted">
                  🔵 Submitted
                </option>

                <option value="In Progress">
                  🟡 In Progress
                </option>

                <option value="Resolved">
                  🟢 Resolved
                </option>
              </select>
            ) : (
              <>
                {issue.status === "Submitted" && (
                  <span className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">
                    Submitted
                  </span>
                )}

                {issue.status === "In Progress" && (
                  <span className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">
                    <Clock className="h-3 w-3" />
                    In Progress
                  </span>
                )}

                {issue.status === "Resolved" && (
                  <span className="flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2.5 py-0.5 font-semibold text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolved
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* DISCUSSION */}
        <DiscussionBoard issueId={issue.id} />
      </div>
    </div>
  );
}