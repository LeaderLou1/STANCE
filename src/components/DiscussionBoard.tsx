"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";
import { MediaUploader } from "./MediaUploader";

interface Comment {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_role: "resident" | "representative" | "admin";
  content: string;
  media_url?: string;
  upvotes: number;
  created_at: string;
}

export function DiscussionBoard({
  issueId,
}: {
  issueId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [attachedMediaUrl, setAttachedMediaUrl] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  useEffect(() => {
    fetchComments();
  }, [issueId]);

  const handleSubmitComment = async (
    parentId: string | null = null,
    text: string,
  ) => {
    if (!text.trim() && !attachedMediaUrl) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        issue_id: issueId,
        parent_id: parentId,
        content: text,
        media_url: parentId ? null : attachedMediaUrl,
      }),
    });

    if (response.ok) {
      setNewComment("");
      setAttachedMediaUrl(null);
      setShowUploader(false);
      setActiveReplyId(null);
      await fetchComments();
    }
  };

  // FIXED: Dynamic Upvote Handler
  const handleCommentUpvote = async (
    commentId: string,
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const result = await response.json();

      if (response.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, upvotes: result.upvotes } : c,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to upvote comment:", err);
    }
  };

  const rootComments = comments.filter((c) => !c.parent_id);
  const getRepliesFor = (commentId: string) =>
    comments.filter((c) => c.parent_id === commentId);

  return (
    <div className="mt-4 border-t pt-4 bg-slate-50/50 p-4 rounded-xl">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" /> Community Discussion Grid
      </h3>

      {/* Main Comment Box Layer */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
            placeholder="Add to the neighborhood discussion..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowUploader(!showUploader)}
            className={`p-2 border rounded-lg transition ${showUploader ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white hover:bg-slate-50 text-slate-400"}`}
            title="Attach media"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSubmitComment(null, newComment)}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition"
          >
            Post
          </button>
        </div>

        {/* Media Uploader Attachment Area */}
        {showUploader && (
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <MediaUploader
              onUploadComplete={(url) => setAttachedMediaUrl(url)}
            />
            {attachedMediaUrl && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                ✓ Media linked to message wrapper.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Render Comment Tree Pipeline */}
      <div className="space-y-3">
        {rootComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            {/* Parent Comment Component */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      comment.user_role === "representative"
                        ? "bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {comment.user_role === "representative" && (
                      <ShieldCheck className="w-3 h-3 text-amber-700" />
                    )}
                    {comment.user_role}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700">{comment.content}</p>

              {/* Render Attached Proof Inline If Present */}
              {comment.media_url && (
                <div className="mt-2 max-w-xs rounded-lg overflow-hidden border">
                  {comment.media_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                    <video
                      src={comment.media_url}
                      controls
                      className="w-full h-auto max-h-48 object-cover"
                    />
                  ) : (
                    <img
                      src={comment.media_url}
                      alt="Discussion proof"
                      className="w-full h-auto max-h-48 object-cover"
                    />
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                {/* FIXED: Connected upvote event action logic */}
                <button
                  onClick={() =>
                    handleCommentUpvote(comment.id)
                  }
                  className="hover:text-emerald-700 flex items-center gap-1 transition"
                >
                  <ThumbsUp className="w-3 h-3" /> {comment.upvotes}
                </button>
                <button
                  onClick={() => setActiveReplyId(comment.id)}
                  className="hover:text-slate-600"
                >
                  Reply
                </button>
              </div>
            </div>

            {/* Inline Nested Reply Input Field */}
            {activeReplyId === comment.id && (
              <div className="flex gap-2 pl-6 items-center">
                <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />
                <input
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                  placeholder="Type your reply..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmitComment(comment.id, e.currentTarget.value);
                    }
                  }}
                />
              </div>
            )}

            {/* Sub-replies Render Layout */}
            {getRepliesFor(comment.id).map((reply) => (
              <div key={reply.id} className="pl-6 flex gap-2">
                <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                <div className="bg-slate-50 border p-2.5 rounded-xl flex-1 text-xs">
                  <div className="mb-0.5">
                    <span className="font-bold text-slate-600 text-[10px] uppercase mr-1.5">
                      {reply.user_role}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
