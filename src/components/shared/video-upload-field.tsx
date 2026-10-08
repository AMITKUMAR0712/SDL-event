"use client";

import { Loader2, VideoIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { uploadToCloudinary } from "@/lib/cloudinary-client-upload";

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

export function VideoUploadField({
  value,
  onChange,
  label = "Video",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!VIDEO_MIME_TYPES.has(file.type)) {
      setError("File must be an MP4, WebM, Ogg, or MOV video.");
      return;
    }
    setError(null);
    setUploading(true);
    const result = await uploadToCloudinary(file, "video");
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className="space-y-2">
      {value && (
        <video
          src={value}
          controls
          className="h-32 w-full rounded-lg border border-border object-cover"
        />
      )}
      <Input
        placeholder={`${label} URL (or upload a file below)`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <VideoIcon className="size-3.5" aria-hidden="true" />
          )}
          {uploading ? "Uploading..." : "Upload from device"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
