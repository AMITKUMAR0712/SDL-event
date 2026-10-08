"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { VideoUploadField } from "@/components/shared/video-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSettingAction } from "@/server/actions/admin";

export type PopupVideoSetting = { title: string; url: string; isActive: boolean };

export function PopupVideoSettingsForm({ initial }: { initial: PopupVideoSetting }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [url, setUrl] = useState(initial.url);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateSettingAction(
      "popup_video",
      JSON.stringify({ title, url, isActive }),
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">Homepage popup video</p>
      <p className="text-sm text-muted-foreground">
        Shown as a popup the moment the website opens, once per visitor session.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input placeholder="Popup title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <VideoUploadField value={url} onChange={setUrl} label="Popup video" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4"
        />
        Active (show the popup on the site)
      </label>
      {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
