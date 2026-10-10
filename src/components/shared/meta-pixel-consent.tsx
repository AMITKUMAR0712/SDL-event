"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/button";

const CONSENT_STORAGE_KEY = "sajdhajlo-meta-pixel-consent";
const META_PIXEL_ID = "1586436972595913";
const consentListeners = new Set<() => void>();

type ConsentChoice = "granted" | "denied" | null;
type ConsentSnapshot = ConsentChoice | "unresolved";

type MetaPixel = {
  (command: "init", pixelId: string): void;
  (
    command: "track",
    eventName: string,
    parameters?: Record<string, string | number>,
    options?: { eventID?: string },
  ): void;
};

declare global {
  interface Window {
    fbq?: MetaPixel;
  }
}

type MetaPixelConsentContextValue = {
  choice: ConsentSnapshot;
  pixelReady: boolean;
  choose: (choice: Exclude<ConsentChoice, null>) => void;
  openPreferences: () => void;
};

const MetaPixelConsentContext = createContext<MetaPixelConsentContextValue | null>(null);

function subscribeToConsent(callback: () => void) {
  consentListeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    consentListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getConsentSnapshot(): ConsentChoice {
  const storedChoice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return storedChoice === "granted" || storedChoice === "denied" ? storedChoice : null;
}

function getServerConsentSnapshot(): ConsentSnapshot {
  return "unresolved";
}

function useMetaPixelConsent() {
  const context = useContext(MetaPixelConsentContext);
  if (!context) {
    throw new Error("Meta Pixel consent controls must be used inside MetaPixelConsentProvider.");
  }
  return context;
}

export function MetaPixelConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [pixelReady, setPixelReady] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const choose = (nextChoice: Exclude<ConsentChoice, null>) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, nextChoice);
    consentListeners.forEach((listener) => listener());
    setPreferencesOpen(false);
  };

  const openPreferences = () => setPreferencesOpen(true);

  return (
    <MetaPixelConsentContext.Provider value={{ choice, pixelReady, choose, openPreferences }}>
      {children}
      {choice === "granted" && (pathname === "/" || pathname === "/payment-success") && (
        <Script
          id="meta-pixel-base"
          strategy="afterInteractive"
          onReady={() => setPixelReady(true)}
        >
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');`}
        </Script>
      )}
      {(choice === null || preferencesOpen) && (
        <aside
          aria-label="Meta Pixel tracking preferences"
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-2xl rounded-xl border border-border bg-background p-5 text-foreground shadow-lg md:bottom-4"
        >
          <p className="font-medium">Choose whether to allow Meta Pixel</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If allowed, Meta Pixel records homepage page views and verified subscription payments
            for advertising measurement. It may send device/browser data to Meta or use cookies.
            This choice controls Meta Pixel only; Google Tag Manager and Google Analytics run
            separately. You can change your choice from the Privacy Policy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => choose("granted")}>
              Allow Meta Pixel
            </Button>
            <Button type="button" variant="outline" onClick={() => choose("denied")}>
              Reject
            </Button>
          </div>
        </aside>
      )}
    </MetaPixelConsentContext.Provider>
  );
}

export function MetaPixelPageView() {
  const { choice, pixelReady } = useMetaPixelConsent();

  useEffect(() => {
    if (choice === "granted" && pixelReady) window.fbq?.("track", "PageView");
  }, [choice, pixelReady]);

  return null;
}

export function MetaPixelSubscribeEvent({
  eventId,
  valuePaise,
}: {
  eventId: string;
  valuePaise: number;
}) {
  const { choice, pixelReady } = useMetaPixelConsent();

  useEffect(() => {
    if (choice !== "granted" || !pixelReady || !window.fbq) return;

    const eventKey = `sajdhajlo-meta-subscribe:${eventId}`;
    if (window.localStorage.getItem(eventKey)) return;

    window.fbq(
      "track",
      "Subscribe",
      { value: valuePaise / 100, currency: "INR" },
      { eventID: eventId },
    );
    window.localStorage.setItem(eventKey, "1");
  }, [choice, eventId, pixelReady, valuePaise]);

  return null;
}

export function MetaPixelConsentSettingsButton() {
  const { openPreferences } = useMetaPixelConsent();

  return (
    <Button type="button" variant="outline" onClick={openPreferences}>
      Manage Meta Pixel consent
    </Button>
  );
}
