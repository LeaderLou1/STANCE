"use client";

import React, { useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { Upload, Loader2 } from "lucide-react";

interface MediaUploaderProps {
  onUploadComplete: (url: string) => void;
}

export function MediaUploader({ onUploadComplete }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      let uploadedPath: string | null = null;
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);

      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("Media files must be 25MB or smaller.");
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        throw new Error("Please choose an image or video file.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in before uploading media.");

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file directly to Supabase S3 bucket layer
      const { error: uploadError } = await supabase.storage
        .from("issue-media")
          .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Capture public CDN distribution string URL
        uploadedPath = filePath;
        onUploadComplete(filePath);
    } catch (err) {
        if (uploadedPath) {
          await supabase.storage.from("issue-media").remove([uploadedPath]);
        }
      console.error("Storage Asset upload failed:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to process media file upload.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 border-slate-200 hover:bg-slate-100/50 transition">
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            Optimizing and distributing media...
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 gap-1">
            <Upload className="w-5 h-5 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Attach Proof (Photo / Video)
            </p>
            <p className="text-[10px] text-slate-400">Max size 25MB</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleMediaUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
