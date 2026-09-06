import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "@/lib/env";
import { notifySearchEnginesOfUpdate } from "@/server/services/search-engine-ping";

describe("notifySearchEnginesOfUpdate", () => {
  const originalIndexNowKey = env.INDEXNOW_KEY;
  const originalGoogleEmail = env.GOOGLE_INDEXING_API_CLIENT_EMAIL;
  const originalGoogleKey = env.GOOGLE_INDEXING_API_PRIVATE_KEY;

  beforeEach(() => {
    env.INDEXNOW_KEY = "";
    env.GOOGLE_INDEXING_API_CLIENT_EMAIL = "";
    env.GOOGLE_INDEXING_API_PRIVATE_KEY = "";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    env.INDEXNOW_KEY = originalIndexNowKey;
    env.GOOGLE_INDEXING_API_CLIENT_EMAIL = originalGoogleEmail;
    env.GOOGLE_INDEXING_API_PRIVATE_KEY = originalGoogleKey;
    vi.unstubAllGlobals();
  });

  it("makes no network calls when no provider is configured", async () => {
    await notifySearchEnginesOfUpdate(["/vendor/glow-studio"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never throws, even if a configured provider's request fails", async () => {
    env.INDEXNOW_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    await expect(notifySearchEnginesOfUpdate(["/vendor/glow-studio"])).resolves.toBeUndefined();
  });

  it("POSTs the expected IndexNow payload when a key is configured", async () => {
    env.INDEXNOW_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await notifySearchEnginesOfUpdate(["/vendor/glow-studio"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.indexnow.org/indexnow",
      expect.objectContaining({ method: "POST" }),
    );
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.key).toBe("test-key");
    expect(body.urlList[0]).toMatch(/\/vendor\/glow-studio$/);
  });
});
