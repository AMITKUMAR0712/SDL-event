import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  MetaPixelConsentProvider,
  MetaPixelConsentSettingsButton,
  MetaPixelPageView,
} from "@/components/shared/meta-pixel-consent";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function ConsentHarness() {
  return (
    <MetaPixelConsentProvider>
      <MetaPixelPageView />
      <MetaPixelConsentSettingsButton />
    </MetaPixelConsentProvider>
  );
}

describe("Meta Pixel consent", () => {
  it("does not render the pixel until consent is granted", async () => {
    render(<ConsentHarness />);

    const preferences = await screen.findByRole("complementary", {
      name: "Meta Pixel tracking preferences",
    });
    expect(preferences).toBeTruthy();
    expect(document.getElementById("meta-pixel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(window.localStorage.getItem("sajdhajlo-meta-pixel-consent")).toBe("denied");
    expect(document.getElementById("meta-pixel")).toBeNull();
  });

  it("allows the visitor to grant consent and reopen their choice", async () => {
    render(<ConsentHarness />);

    await screen.findByRole("complementary", { name: "Meta Pixel tracking preferences" });
    fireEvent.click(screen.getByRole("button", { name: "Allow Meta Pixel" }));

    expect(window.localStorage.getItem("sajdhajlo-meta-pixel-consent")).toBe("granted");
    expect(document.getElementById("meta-pixel")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Manage Meta Pixel consent" }));
    expect(
      screen.getByRole("complementary", { name: "Meta Pixel tracking preferences" }),
    ).toBeTruthy();
  });
});
