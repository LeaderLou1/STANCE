import React from "react";
import {
  ArrowUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Wrench, // 🌟 New enterprise icon
} from "lucide-react";
import { UserRole } from "@/src/types";
import { DiscussionBoard } from "./DiscussionBoard";

interface IssueCardProps {
  issue: any;
  currentRole: UserRole;
  onUpvote: (id: string, votes: number) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onStartEditing: (issue: any) => void;
  onDelete: (id: string) => void;
  onAddReply: (id: string) => void;
  onDispatchWorkOrder?: (id: string) => void; // 🌟 B2B Expansion Prop
}

export function IssueCard({
  issue,
  currentRole,
  onUpvote,
  onUpdateStatus,
  onStartEditing,
  onDelete,
  onAddReply,
  onDispatchWorkOrder, // 🌟 Destructured for premium utility
}: IssueCardProps) {
  return (
    <div className="group flex flex-col gap-5 border border-[#cbd5cc] bg-[#fffefa] p-5 transition hover:-translate-y-0.5 hover:border-[#91aa99] hover:shadow-[0_12px_30px_rgba(23,33,29,0.08)] sm:flex-row sm:p-6">
      {/* UPVOTE COLUMN */}
      <div className="flex sm:flex-col items-center justify-start">
        <button
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
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* HEADER TAGS */}
          <div className="flex justify-between items-center">
            <span className="border border-[#cbd5cc] bg-[#f3f1ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#647168]">
              {issue.category}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
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
          <div className="flex justify-between items-start mt-3">
            <div className="flex-1">
              <h3 className="text-lg font-black tracking-[-0.025em] text-[#17211d]">
                {issue.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#647168]">{issue.description}</p>

              {issue.resolution_proof_url && (
                <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {issue.resolution_proof_url.match(
                    /\.(mp4|webm|ogg|mov)(\?.*)?$/i,
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

              {issue.resolution_notes && (
                <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900">
                  <strong className="text-emerald-800 uppercase tracking-wider block mb-1">
                    Official Response:
                  </strong>
                  {issue.resolution_notes}
                </div>
              )}
            </div>

            {/* ACTION INTERACTION BUTTONS */}
            <div className="flex flex-wrap gap-2 ml-4 justify-end max-w-60">
              {/* 🌟 B2B AUTOMATED WORK ORDER DISPATCH BUTTON */}
              {currentRole === "representative" && onDispatchWorkOrder && (
                <button
                  onClick={() => onDispatchWorkOrder(issue.id)}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Wrench className="w-3.5 h-3.5" /> Dispatch Crew
                </button>
              )}

              {currentRole === "representative" && (
                <button
                  onClick={() => onAddReply(issue.id)}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-[#0f5132] px-2.5 py-1.5 rounded-md font-bold border border-emerald-200 transition"
                >
                  Official Reply
                </button>
              )}

              {currentRole === "resident" && (
                <>
                  <button
                    onClick={() => onStartEditing(issue)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-semibold transition"
                  >
                    Edit Request
                  </button>
                  <button
                    onClick={() => onDelete(issue.id)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-md font-semibold border border-red-100 transition"
                  >
                    Delete
                  </button>
                </>
              )}

              {currentRole === "admin" && (
                <button
                  onClick={() => onDelete(issue.id)}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md font-bold transition shadow-sm"
                >
                  Admin Purge
                </button>
              )}
            </div>
          </div>
        </div>

        {/* METRICS ZONE AND STATUS BADGES */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              {issue.representative?.name ? (
                <span>
                  {issue.representative.name}{" "}
                  <span className="text-gray-400 font-normal">
                    ({issue.representative.party || "Ind."} - District{" "}
                    {issue.representative.district})
                  </span>
                </span>
              ) : (
                <span className="text-gray-400 italic">
                  Auto-assigning Representative...
                </span>
              )}
            </div>
            <span className="text-gray-300">|</span>
            <span>
              District Zone:{" "}
              <strong className="text-gray-700">{issue.zip_code}</strong>
            </span>
          </div>

          <div>
            {currentRole !== "resident" ? (
              <select
                value={issue.status}
                onChange={(e) => onUpdateStatus(issue.id, e.target.value)}
                className="text-xs font-bold border rounded-lg bg-gray-50 p-1.5 cursor-pointer text-gray-700 outline-none focus:ring-2 focus:ring-[#0f5132]"
              >
                <option value="Submitted">🔵 Submitted</option>
                <option value="In Progress">🟡 In Progress</option>
                <option value="Resolved">🟢 Resolved</option>
              </select>
            ) : (
              <>
                {issue.status === "Submitted" && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                    Submitted
                  </span>
                )}
                {issue.status === "In Progress" && (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" /> In Progress
                  </span>
                )}
                {issue.status === "Resolved" && (
                  <span className="bg-green-50 text-green-700 border border-green-200 font-semibold px-2.5 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Resolved
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* DISCUSSION BOARD LOOP */}
        <DiscussionBoard issueId={issue.id} />
      </div>
    </div>
  );
}