import { PopupVideoModal } from "@/components/shared/popup-video-modal";
import { getSetting } from "@/server/repositories/settings";

type PopupVideoSetting = { title: string; url: string; isActive: boolean };

export async function PopupVideoGate() {
  const video = await getSetting<PopupVideoSetting>("popup_video", {
    title: "",
    url: "",
    isActive: false,
  });

  if (!video.isActive || !video.url) return null;
  return <PopupVideoModal title={video.title} url={video.url} />;
}
