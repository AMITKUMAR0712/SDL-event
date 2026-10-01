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

function subscribeToCoarsePointer(callback: () => void) {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * True on touch-primary devices (phones/tablets) — anywhere the main input
 * is a finger rather than a mouse. Lenis's own continuous rAF loop and
 * document-wide touch handling fight with real touch-driven interactions on
 * these devices (dropdowns needing several frames to open can lose the tap
 * entirely under any main-thread contention, which a real mid-range phone
 * has far more of than a dev machine); native touch scrolling is already
 * smooth, so there's nothing Lenis is adding here worth that risk.
 */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeToCoarsePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const isCoarsePointer = useCoarsePointer();

  if (prefersReducedMotion || isCoarsePointer) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ autoRaf: true }}>
      <SmoothScrollBridge>{children}</SmoothScrollBridge>
    </ReactLenis>
  );
}
