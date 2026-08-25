"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { MediaUploader } from "./MediaUploader";

interface Comment {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_role: "resident" | "representative" | "admin";
  content: string;
  media_url?: string | null;
  upvotes: number;
  created_at: string;
}

interface DiscussionBoardProps {
  issueId: string;
}

interface VoteResponse {
  upvotes?: number;
}

function DiscussionBoard({ issueId }: DiscussionBoardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [attachedMediaUrl, setAttachedMediaUrl] =
    useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [activeReplyId, setActiveReplyId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("issue_id", issueId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load comments:", error);
        setComments([]);
        return;
      }

      setComments((data as Comment[]) ?? []);
    };

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [issueId]);

  const refreshComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to refresh comments:", error);
      return;
    }

    setComments((data as Comment[]) ?? []);
  };

  const handleSubmitComment = async (
    parentId: string | null = null,
    text: string,
  ) => {
    if (!text.trim() && !attachedMediaUrl) return;

    const { data: sessionData } =
      await supabase.auth.getSession();

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

    if (!response.ok) return;

    setNewComment("");
    setAttachedMediaUrl(null);
    setShowUploader(false);
    setActiveReplyId(null);

    await refreshComments();
  };

  const handleCommentUpvote = async (commentId: string) => {
    try {
      const { data: sessionData } =
        await supabase.auth.getSession();

      if (!sessionData.session) return;

      const response = await fetch(
        `/api/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        },
      );

      const result = (await response.json()) as VoteResponse;

      if (!response.ok) return;

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                upvotes:
                  typeof result.upvotes === "number"
                    ? result.upvotes
                    : comment.upvotes,
              }
            : comment,
        ),
      );
    } catch (error) {
      console.error("Failed to upvote comment:", error);
    }
  };

  const rootComments = comments.filter(
    (comment) => !comment.parent_id,
  );

  const getRepliesFor = (commentId: string) =>
    comments.filter(
      (comment) => comment.parent_id === commentId,
    );

  return (
    <div className="mt-4 rounded-xl border-t bg-slate-50/50 p-4 pt-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <MessageSquare className="h-3.5 w-3.5" />
        Community Discussion Grid
      </h3>

      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-700"
            placeholder="Add to the neighborhood discussion..."
            value={newComment}
            onChange={(event) =>
              setNewComment(event.target.value)
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowUploader((current) => !current)
            }
            className={`rounded-lg border p-2 transition ${
              showUploader
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "bg-white text-slate-400 hover:bg-slate-50"
            }`}
            title="Attach media"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSubmitComment(null, newComment)
            }
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-900"
          >
            Post
          </button>
        </div>

        {showUploader && (
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <MediaUploader
              onUploadComplete={(url) =>
                setAttachedMediaUrl(url)
              }
            />

            {attachedMediaUrl && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                ✓ Media linked to message.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {rootComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      comment.user_role === "representative"
                        ? "flex items-center gap-0.5 border border-amber-200 bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {comment.user_role === "representative" && (
                      <ShieldCheck className="h-3 w-3 text-amber-700" />
                    )}

                    {comment.user_role}
                  </span>

                  <span className="text-[10px] text-slate-400">
                    {new Date(
                      comment.created_at,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700">
                {comment.content}
              </p>

              {comment.media_url && (
                <div className="mt-2 max-w-xs overflow-hidden rounded-lg border">
                  {comment.media_url.match(
                    /\.(mp4|webm|ogg|mov)(\?.*)?$/i,
                  ) ? (
                    <video
                      src={comment.media_url}
                      controls
                      className="h-auto max-h-48 w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.media_url}
                      alt="Discussion proof"
                      className="h-auto max-h-48 w-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                <button
                  type="button"
                  onClick={() =>
                    void handleCommentUpvote(comment.id)
                  }
                  className="flex items-center gap-1 transition hover:text-emerald-700"
                >
                  <ThumbsUp className="h-3 w-3" />
                  {comment.upvotes}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveReplyId(comment.id)
                  }
                  className="hover:text-slate-600"
                >
                  Reply
                </button>
              </div>
            </div>

            {activeReplyId === comment.id && (
              <div className="flex items-center gap-2 pl-6">
                <CornerDownRight className="h-4 w-4 shrink-0 text-slate-300" />

                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="Type your reply..."
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSubmitComment(
                        comment.id,
                        event.currentTarget.value,
                      );
                    }
                  }}
                />
              </div>
            )}

            {getRepliesFor(comment.id).map((reply) => (
              <div
                key={reply.id}
                className="flex gap-2 pl-6"
              >
                <CornerDownRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />

                <div className="flex-1 rounded-xl border bg-slate-50 p-2.5 text-xs">
                  <div className="mb-0.5">
                    <span className="mr-1.5 text-[10px] font-bold uppercase text-slate-600">
                      {reply.user_role}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      {new Date(
                        reply.created_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-slate-700">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { DiscussionBoard };