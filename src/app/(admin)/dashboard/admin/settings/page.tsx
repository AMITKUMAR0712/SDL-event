import {
  type PopupVideoSetting,
  PopupVideoSettingsForm,
} from "@/components/shared/popup-video-settings-form";
import { SettingEditor } from "@/components/shared/setting-editor";
import {
  type VendorGuideVideoSetting,
  VendorGuideVideoSettingsForm,
} from "@/components/shared/vendor-guide-video-settings-form";
import { listAllSettings } from "@/server/repositories/admin";
import { getSetting } from "@/server/repositories/settings";

export const dynamic = "force-dynamic";

const POPUP_VIDEO_FALLBACK: PopupVideoSetting = { title: "", url: "", isActive: false };
const VENDOR_GUIDE_VIDEO_FALLBACK: VendorGuideVideoSetting = { url: "", isActive: false };

export default async function AdminSettingsPage() {
  const [settings, popupVideo, vendorGuideVideo] = await Promise.all([
    listAllSettings(),
    getSetting("popup_video", POPUP_VIDEO_FALLBACK),
    getSetting("vendor_guide_video", VENDOR_GUIDE_VIDEO_FALLBACK),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-3xl">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every value here is read live by the app (ranking weights, commission %, unlock quotas,
        cancellation policy) — no deploy needed to change them.
      </p>
      <div className="mt-6 space-y-3">
        <PopupVideoSettingsForm initial={popupVideo} />
        <VendorGuideVideoSettingsForm initial={vendorGuideVideo} />
        {settings.map((s) => (
          <SettingEditor key={s.key} settingKey={s.key} value={s.value} />
        ))}
      </div>
    </main>
  );
}
