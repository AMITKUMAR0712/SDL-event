"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { VideoUploadField } from "@/components/shared/video-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateSettingAction } from "@/server/actions/admin";

export type VendorGuideVideoSetting = { url: string; isActive: boolean };

export function VendorGuideVideoSettingsForm({ initial }: { initial: VendorGuideVideoSetting }) {
  const router = useRouter();
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
      "vendor_guide_video",
      JSON.stringify({ url, isActive }),
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
      <p className="font-medium">Vendor onboarding guide video</p>
      <p className="text-sm text-muted-foreground">
        Shown as a &quot;Watch video&quot; button on step 1 of the vendor onboarding wizard.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <VideoUploadField value={url} onChange={setUrl} label="Guide video" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4"
        />
        Active (show the button in onboarding)
      </label>
      {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
      <Button size="sm" onClick={save} disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
