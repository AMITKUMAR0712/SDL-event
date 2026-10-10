import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { MetaPixelConsentProvider } from "@/components/shared/meta-pixel-consent";
import { PopupVideoGate } from "@/components/shared/popup-video-gate";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MetaPixelConsentProvider>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <BottomNavBar />
      <PopupVideoGate />
    </MetaPixelConsentProvider>
  );
}
