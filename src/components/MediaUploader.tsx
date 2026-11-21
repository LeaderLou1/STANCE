
"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

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
      });

      const result: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to upload your image."
        );
      }

      const uploadedPath = result.path || result.url;

      if (!uploadedPath) {
        throw new Error("The server did not return an uploaded image path.");
      }

      const previewUrl = URL.createObjectURL(file);

      setPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return previewUrl;
      });

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
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setFileName("");
    setError("");
    onUploadComplete("");
  };

  return (
    <div className="w-full space-y-2">
      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-[#d5ded5] bg-[#f6f7f2]">
          <img
            src={preview}
            alt={`Preview of ${fileName}`}
            className="h-48 w-full object-cover"
          />

          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <p className="truncate text-xs font-medium text-[#365444]">
              {fileName}
            </p>

            <button
              type="button"
              onClick={clearSelection}
              disabled={uploading}
              aria-label="Remove attached image"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#647168] hover:bg-[#e8eee9] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#cbd5cc] bg-[#f8f9f5] transition hover:border-[#47745b] hover:bg-[#f0f5ef]">
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-[#47745b]" />
              <span className="text-xs font-semibold text-[#647168]">
                Uploading image...
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-[#47745b]" />

              <span className="text-xs font-bold text-[#365444]">
                Add a photo
              </span>

              <span className="text-[10px] text-[#89938a]">
                JPG, PNG, or WebP · Maximum 10 MB
              </span>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleMediaUpload}
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
