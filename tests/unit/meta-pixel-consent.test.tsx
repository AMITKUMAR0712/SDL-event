import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/script", async () => {
  const { createElement, useEffect } = await import("react");

  function MockScript({
    id,
    children,
    onReady,
  }: {
    id: string;
    children: ReactNode;
    onReady?: () => void;
  }) {
    useEffect(() => {
      onReady?.();
    }, [onReady]);

    return createElement("script", { id }, children);
  }

  return {
    default: MockScript,
  };
});

import {
  MetaPixelConsentProvider,
  MetaPixelConsentSettingsButton,
  MetaPixelPageView,
  MetaPixelSubscribeEvent,
} from "@/components/shared/meta-pixel-consent";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete window.fbq;
});

function ConsentHarness() {
  return (
    <MetaPixelConsentProvider>
      <MetaPixelPageView />
      <MetaPixelSubscribeEvent eventId="payment-1" valuePaise={12_345} />
      <MetaPixelSubscribeEvent eventId="payment-1" valuePaise={12_345} />
      <MetaPixelConsentSettingsButton />
    </MetaPixelConsentProvider>
  );
}

describe("Meta Pixel consent", () => {
  it("does not load or track Meta Pixel when consent is denied", async () => {
    const track = vi.fn();
    window.fbq = track;

    render(<ConsentHarness />);
    await screen.findByRole("complementary", { name: "Meta Pixel tracking preferences" });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(window.localStorage.getItem("sajdhajlo-meta-pixel-consent")).toBe("denied");
    expect(document.getElementById("meta-pixel-base")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it("tracks Subscribe once per payment with the verified INR value and supports consent updates", async () => {
    const track = vi.fn();
    window.fbq = track;

    render(<ConsentHarness />);
    await screen.findByRole("complementary", { name: "Meta Pixel tracking preferences" });
    fireEvent.click(screen.getByRole("button", { name: "Allow Meta Pixel" }));

    await waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        "track",
        "Subscribe",
        { value: 123.45, currency: "INR" },
        { eventID: "payment-1" },
      );
    });
    expect(track.mock.calls.filter(([, eventName]) => eventName === "Subscribe")).toHaveLength(1);
    expect(track).toHaveBeenCalledWith("track", "PageView");
    expect(window.localStorage.getItem("sajdhajlo-meta-subscribe:payment-1")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Manage Meta Pixel consent" }));
    expect(
      screen.getByRole("complementary", { name: "Meta Pixel tracking preferences" }),
    ).toBeTruthy();
  });
});
