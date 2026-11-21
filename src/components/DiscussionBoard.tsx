
"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  ImageIcon,
  Send,
  Loader2,
} from "lucide-react";

import { supabase } from "@/src/lib/supabase";
import { MediaUploader } from "./MediaUploader";

interface Comment {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_id?: string;
  user_role: "resident" | "representative" | "admin";
  content: string;
  media_url?: string | null;
  status?: string;
  upvotes: number;
  created_at: string;
}

interface DiscussionBoardProps {
  issueId: string;
}

interface VoteResponse {
  upvotes?: number;
  error?: string;
}

function formatCommentDate(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return /\.(mp4|webm|ogg|mov)$/i.test(pathname);
  } catch {
    return false;
  }
}

function DiscussionBoard({ issueId }: DiscussionBoardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<
    Record<string, string>
  >({});

  const [newComment, setNewComment] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [attachedMediaUrl, setAttachedMediaUrl] =
    useState<string | null>(null);

  const [showUploader, setShowUploader] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const [loadingComments, setLoadingComments] = useState(true);
  const [posting, setPosting] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      setLoadingComments(true);
      setErrorMessage("");
      setComments([]);
      setResolvedMediaUrls({});

      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("issue_id", issueId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load comments:", error);
        setErrorMessage("Unable to load the discussion. Please try again.");
        setLoadingComments(false);
        return;
      }

      setComments((data as Comment[]) ?? []);
      setLoadingComments(false);
    };

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [issueId]);

  useEffect(() => {
    let cancelled = false;

    const resolveMediaUrls = async () => {
      const resolved = await Promise.all(
        comments.map(async (comment) => {
          if (!comment.media_url) {
            return [comment.id, null] as const;
          }

          if (
            comment.media_url.startsWith("http://") ||
            comment.media_url.startsWith("https://")
          ) {
            return [comment.id, comment.media_url] as const;
          }

          const { data, error } = await supabase.storage
            .from("issue-media")
            .createSignedUrl(comment.media_url, 3600);

          return [
            comment.id,
            error ? null : data?.signedUrl ?? null,
          ] as const;
        })
      );

      if (cancelled) return;

      setResolvedMediaUrls(
        Object.fromEntries(
          resolved.filter(
            (entry): entry is readonly [string, string] =>
              Boolean(entry[1])
          )
        )
      );
    };

    void resolveMediaUrls();

    return () => {
      cancelled = true;
    };
  }, [comments]);

  const refreshComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to refresh comments:", error);
      setErrorMessage("Your action succeeded, but the discussion could not refresh.");
      return false;
    }

    setComments((data as Comment[]) ?? []);
    return true;
  };

  const handleSubmitComment = async (
    parentId: string | null,
    text: string
  ) => {
    const content = text.trim();

    if (!content && (!attachedMediaUrl || parentId)) {
      setErrorMessage("Write a message before posting.");
      return;
    }

    if (posting) return;

    setPosting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setErrorMessage("Please sign in before posting.");
        return;
      }

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          issue_id: issueId,
          parent_id: parentId,
          content,
          media_url: parentId ? null : attachedMediaUrl,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Your message could not be posted."
        );
      }

      if (parentId === null) {
        setNewComment("");
        setAttachedMediaUrl(null);
        setShowUploader(false);
      } else {
        setReplyDraft("");
        setActiveReplyId(null);
      }

      setSuccessMessage(
        parentId ? "Reply posted." : "Comment posted."
      );

      await refreshComments();
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting."
      );
    } finally {
      setPosting(false);
    }
  };

  const handleCommentUpvote = async (commentId: string) => {
    if (votingCommentId) return;

    setVotingCommentId(commentId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setErrorMessage("Please sign in before voting.");
        return;
      }

      const response = await fetch(
        `/api/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      const result = (await response.json()) as VoteResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Your vote could not be recorded."
        );
      }

      if (typeof result.upvotes === "number") {
        setComments((previous) =>
          previous.map((comment) =>
            comment.id === commentId
              ? { ...comment, upvotes: result.upvotes! }
              : comment
          )
        );
      }

      setSuccessMessage("Your vote was recorded.");
    } catch (error) {
      console.error("Failed to upvote comment:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to record your vote."
      );
    } finally {
      setVotingCommentId(null);
    }
  };

  const rootComments = comments.filter(
    (comment) => !comment.parent_id
  );

  const getRepliesFor = (commentId: string) =>
    comments.filter((comment) => comment.parent_id === commentId);

  return (
    <section
      aria-labelledby="discussion-heading"
      className="mt-4 min-w-0 rounded-xl border-t border-slate-200 bg-slate-50/70 p-3 pt-4 sm:p-4"
    >
      <h3
        id="discussion-heading"
        className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"
      >
        <MessageSquare
          aria-hidden="true"
          className="h-4 w-4"
        />
        Community discussion
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
          {comments.length}
        </span>
      </h3>

      {(errorMessage || successMessage) && (
        <div
          role={errorMessage ? "alert" : "status"}
          aria-live="polite"
          className={`mb-3 rounded-lg border p-3 text-sm leading-5 ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <form
        className="mb-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitComment(null, newComment);
        }}
      >
        <label
          htmlFor={`new-comment-${issueId}`}
          className="block text-sm font-semibold text-slate-700"
        >
          Join the discussion
        </label>

        <textarea
          id={`new-comment-${issueId}`}
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder="Share information or contribute to the discussion..."
          rows={3}
          maxLength={2000}
          className="block min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setShowUploader((current) => !current)}
            aria-expanded={showUploader}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
              showUploader
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ImageIcon aria-hidden="true" className="h-4 w-4" />
            {showUploader ? "Hide attachment" : "Attach media"}
          </button>

          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {posting ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
                Posting...
              </>
            ) : (
              <>
                <Send aria-hidden="true" className="h-4 w-4" />
                Post comment
              </>
            )}
          </button>
        </div>

        {showUploader && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <MediaUploader
              onUploadComplete={(url) => setAttachedMediaUrl(url)}
            />

            {attachedMediaUrl && (
              <p
                role="status"
                className="mt-2 break-all text-sm font-semibold text-emerald-700"
              >
                Media attached successfully.
              </p>
            )}
          </div>
        )}
      </form>

      <div
        className="space-y-4"
        aria-label="Discussion comments"
      >
        {loadingComments ? (
          <div
            role="status"
            className="flex items-center gap-2 py-6 text-sm text-slate-500"
          >
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
            Loading discussion...
          </div>
        ) : rootComments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <MessageSquare
              aria-hidden="true"
              className="mx-auto h-7 w-7 text-slate-300"
            />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              No comments yet
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Start the conversation by sharing a useful observation.
            </p>
          </div>
        ) : (
          rootComments.map((comment) => {
            const resolvedMediaUrl =
              resolvedMediaUrls[comment.id] ?? null;

            const replies = getRepliesFor(comment.id);

            return (
              <article
                key={comment.id}
                className="min-w-0 space-y-3"
              >
                <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                          comment.user_role === "representative"
                            ? "border border-amber-200 bg-amber-50 text-amber-800"
                            : comment.user_role === "admin"
                              ? "border border-indigo-200 bg-indigo-50 text-indigo-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {comment.user_role === "representative" && (
                          <ShieldCheck
                            aria-hidden="true"
                            className="h-3 w-3"
                          />
                        )}
                        {comment.user_role}
                      </span>

                      <time
                        dateTime={comment.created_at}
                        className="text-xs text-slate-500"
                      >
                        {formatCommentDate(comment.created_at)}
                      </time>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {comment.content}
                  </p>

                  {resolvedMediaUrl && (
                    <div className="mt-3 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:max-w-sm">
                      {isVideoUrl(resolvedMediaUrl) ? (
                        <video
                          src={resolvedMediaUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-64 w-full object-contain"
                        >
                          Your browser does not support video playback.
                        </video>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedMediaUrl}
                          alt="Media attached to this discussion comment"
                          loading="lazy"
                          className="max-h-64 w-full object-contain"
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={votingCommentId !== null}
                      onClick={() =>
                        void handleCommentUpvote(comment.id)
                      }
                      aria-label={`Upvote comment. ${comment.upvotes} current votes`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {votingCommentId === comment.id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <ThumbsUp
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                      )}
                      {comment.upvotes}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyId((current) =>
                          current === comment.id ? null : comment.id
                        );
                        setReplyDraft("");
                      }}
                      aria-expanded={activeReplyId === comment.id}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      Reply
                      {replies.length > 0 && (
                        <span className="ml-1 text-slate-400">
                          ({replies.length})
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {activeReplyId === comment.id && (
                  <form
                    className="ml-3 flex min-w-0 gap-2 sm:ml-6"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSubmitComment(
                        comment.id,
                        replyDraft
                      );
                    }}
                  >
                    <CornerDownRight
                      aria-hidden="true"
                      className="mt-3 h-4 w-4 shrink-0 text-slate-400"
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <label
                        htmlFor={`reply-${comment.id}`}
                        className="sr-only"
                      >
                        Write a reply
                      </label>

                      <textarea
                        id={`reply-${comment.id}`}
                        value={replyDraft}
                        onChange={(event) =>
                          setReplyDraft(event.target.value)
                        }
                        rows={2}
                        maxLength={2000}
                        placeholder="Write your reply..."
                        className="block min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-base leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                      />

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyId(null);
                            setReplyDraft("");
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={posting || !replyDraft.trim()}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {posting ? "Sending..." : "Send reply"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="ml-3 flex min-w-0 gap-2 sm:ml-6"
                  >
                    <CornerDownRight
                      aria-hidden="true"
                      className="mt-3 h-4 w-4 shrink-0 text-slate-400"
                    />

                    <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase text-slate-600"
                        >
                          {reply.user_role}
                        </span>

                        <time
                          dateTime={reply.created_at}
                          className="text-xs text-slate-500"
                        >
                          {formatCommentDate(reply.created_at)}
                        </time>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export { DiscussionBoard };
