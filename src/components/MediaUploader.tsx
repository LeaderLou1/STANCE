"use client";

import React, { useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { Upload, Film, Image as ImageIcon, Loader2 } from "lucide-react";

interface MediaUploaderProps {
  onUploadComplete: (url: string) => void;
}

export function MediaUploader({ onUploadComplete }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      // Generate unique name to prevent cache collision overrides
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload file directly to Supabase S3 bucket layer
      const { error: uploadError } = await supabase.storage
        .from("issue-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Capture public CDN distribution string URL
      const { data } = supabase.storage
        .from("issue-media")
        .getPublicUrl(filePath);

      onUploadComplete(data.publicUrl);
    } catch (err) {
      console.error("Storage Asset upload failed:", err);
      alert("Failed to process media file upload.");
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
