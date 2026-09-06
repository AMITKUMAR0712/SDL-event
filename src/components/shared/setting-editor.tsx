"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { updateSettingAction } from "@/server/actions/admin";

export function SettingEditor({ settingKey, value }: { settingKey: string; value: unknown }) {
  const [raw, setRaw] = useState(JSON.stringify(value));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateSettingAction(settingKey, raw);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-mono text-sm font-medium">{settingKey}</p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="mt-2 w-full rounded-lg border border-input bg-transparent p-2 font-mono text-sm"
        rows={2}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      {saved && <p className="mt-1 text-sm text-muted-foreground">Saved.</p>}
      <Button size="sm" className="mt-2" onClick={save} disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
