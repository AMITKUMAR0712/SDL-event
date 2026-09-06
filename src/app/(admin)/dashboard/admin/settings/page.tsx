import { SettingEditor } from "@/components/shared/setting-editor";
import { listAllSettings } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await listAllSettings();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-3xl">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every value here is read live by the app (ranking weights, commission %, unlock quotas,
        cancellation policy) — no deploy needed to change them.
      </p>
      <div className="mt-6 space-y-3">
        {settings.map((s) => (
          <SettingEditor key={s.key} settingKey={s.key} value={s.value} />
        ))}
      </div>
    </main>
  );
}
