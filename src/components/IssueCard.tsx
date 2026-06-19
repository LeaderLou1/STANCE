import React from "react";
import {
  ArrowUp,
  ShieldCheck,
  AlertCircle,
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
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex gap-6 hover:shadow-md transition flex-col sm:flex-row">
      {/* UPVOTE COLUMN */}
      <div className="flex sm:flex-col items-center justify-start">
        <button
          onClick={() => onUpvote(issue.id, issue.upvotes)}
          className="flex flex-col items-center justify-start bg-gray-50 hover:bg-gray-100 border rounded-xl p-3 h-16 w-12 transition group"
        >
          <ArrowUp className="w-4 h-4 text-gray-500 group-hover:text-green-700 group-hover:-translate-y-0.5 transition-all" />
          <span className="text-sm font-bold text-gray-800 mt-1">
            {issue.upvotes}
          </span>
        </button>
      </div>

      {/* MAIN DATA CONTAINER */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* HEADER TAGS */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border">
              {issue.category}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                issue.urgency === "Critical Danger"
                  ? "bg-red-100 text-red-700"
                  : issue.urgency === "High Breakdown"
                    ? "bg-orange-100 text-orange-700"
                    : issue.urgency === "Medium Baseline"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {issue.urgency || "Medium Baseline"}
            </span>
          </div>

          {/* CONTENT FIELD BLOCK */}
          <div className="flex justify-between items-start mt-3">
            <div className="flex-1">
              <h3 className="font-extrabold text-gray-900 text-lg">
                {issue.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{issue.description}</p>

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
            <div className="flex flex-wrap gap-2 ml-4 justify-end  `max-w-60`">
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
                    <AlertCircle className="w-3 h-3" /> Submitted
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
        <DiscussionBoard issueId={issue.id} currentRole={currentRole} />
      </div>
    </div>
  );
}
