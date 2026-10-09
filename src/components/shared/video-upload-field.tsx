"use client";

import { Loader2, VideoIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";

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
  const [previewBroken, setPreviewBroken] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setPreviewBroken(false);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload/video", { method: "POST", body: formData });
      const result: { ok: true; data: { url: string } } | { ok: false; error: string } =
        await response.json();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.data.url);
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <video
          key={value}
          src={value}
          controls
          onError={() => setPreviewBroken(true)}
          className="h-32 w-full rounded-lg border border-border object-cover"
        />
      )}
      {value && previewBroken && (
        <p className="text-xs text-destructive">
          This link doesn&apos;t play as a video — a share-page link (like a Google Drive, Claude,
          or ScreenApp link) won&apos;t work here. Use &quot;Upload from device&quot; below, or
          paste a direct video file link instead.
        </p>
      )}
      <Input
        placeholder={`${label} URL (or upload a file below)`}
        value={value}
        onChange={(e) => {
          setPreviewBroken(false);
          onChange(e.target.value);
        }}
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
      {uploading && (
        <p className="text-xs text-muted-foreground">
          Larger videos can take a minute or two — this is uploading over your internet connection,
          not stuck. Keep this page open.
        </p>
      )}
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
