"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export function ImageUploadField({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/upload/image", { method: "POST", body: formData });
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
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="size-14 shrink-0 rounded-lg border border-border object-cover"
          />
        )}
        <div className="flex-1 space-y-1">
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
                <ImagePlus className="size-3.5" aria-hidden="true" />
              )}
              {uploading ? "Uploading..." : "Upload from device"}
            </button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
