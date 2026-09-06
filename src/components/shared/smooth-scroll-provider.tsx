"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

type SmoothScrollContextValue = {
  /** Stop Lenis smooth scrolling — call when opening a modal or a scroll-locked area. */
  pause: () => void;
  /** Resume Lenis smooth scrolling after `pause()`. */
  resume: () => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null);

/**
 * useSmoothScroll().pause() / .resume() is how modals, drawers, and other
 * scroll-locked overlays should stop Lenis from fighting native scroll lock.
 * Falls back to no-ops outside the provider (e.g. in tests) instead of throwing.
 */
export function useSmoothScroll(): SmoothScrollContextValue {
  return (
    useContext(SmoothScrollContext) ?? {
      pause: () => {},
      resume: () => {},
    }
  );
}

function SmoothScrollBridge({ children }: { children: React.ReactNode }) {
  const lenis = useLenis();
  const [contextValue] = useState<SmoothScrollContextValue>(() => ({
    pause: () => lenis?.stop(),
    resume: () => lenis?.start(),
  }));

  return (
    <SmoothScrollContext.Provider value={contextValue}>{children}</SmoothScrollContext.Provider>
  );
}

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ autoRaf: true }}>
      <SmoothScrollBridge>{children}</SmoothScrollBridge>
    </ReactLenis>
  );
}
