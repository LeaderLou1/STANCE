
"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";

interface MediaUploaderProps {
  onUploadComplete: (url: string) => void;
}

interface UploadResponse {
  path?: string;
  url?: string;
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function MediaUploader({
  onUploadComplete,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!preview) return;

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleMediaUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Images must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/reports/media", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      let result: UploadResponse;

      try {
        result = (await response.json()) as UploadResponse;
      } catch {
        throw new Error(
          response.status === 404
            ? "Image uploads are not available yet."
            : "The server returned an invalid upload response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to upload your image."
        );
      }

      const uploadedPath = result.url || result.path;

      if (
        typeof uploadedPath !== "string" ||
        !uploadedPath.trim()
      ) {
        throw new Error(
          "The server did not return an uploaded image path."
        );
      }

      const previewUrl = URL.createObjectURL(file);

      setPreview(previewUrl);
      setFileName(file.name);

      onUploadComplete(uploadedPath);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload your image.";

      setError(message);
      console.error("Media upload failed:", message);
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const clearSelection = () => {
    if (uploading) return;

    setPreview(null);
    setFileName("");
    setError("");

    onUploadComplete("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleMediaUpload}
        disabled={uploading}
        aria-label="Choose an image to attach"
      />

      {preview ? (
        <div className="overflow-hidden rounded-xl border border-[#d5ded5] bg-[#f6f7f2]">
          <div className="relative">
            <Image
              src={preview}
              alt={`Preview of ${fileName}`}
              width={1200}
              height={800}
              unoptimized
              className="max-h-64 min-h-40 w-full object-contain"
            />

            {uploading && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/40"
                role="status"
                aria-live="polite"
              >
                <Loader2
                  aria-hidden="true"
                  className="h-8 w-8 animate-spin text-white"
                />
                <span className="sr-only">Uploading image</span>
              </div>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[#47745b]"
              />
              <p className="truncate text-xs font-semibold text-[#365444]">
                {fileName}
              </p>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              disabled={uploading}
              aria-label="Remove attached image"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#647168] transition hover:bg-[#e8eee9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#cbd5cc] bg-[#f8f9f5] px-4 py-5 text-center transition hover:border-[#47745b] hover:bg-[#f0f5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b43] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2
                aria-hidden="true"
                className="h-7 w-7 animate-spin text-[#47745b]"
              />
              <span className="text-sm font-semibold text-[#365444]">
                Uploading image...
              </span>
              <span className="text-xs text-[#647168]">
                Please wait
              </span>
            </>
          ) : (
            <>
              <ImagePlus
                aria-hidden="true"
                className="h-7 w-7 text-[#47745b]"
              />
              <span className="text-sm font-bold text-[#365444]">
                Add a photo
              </span>
              <span className="text-xs leading-5 text-[#647168]">
                JPG, PNG, or WebP · Maximum 10 MB
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <X
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
          />
          <p className="break-words text-sm leading-5 text-red-800">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
