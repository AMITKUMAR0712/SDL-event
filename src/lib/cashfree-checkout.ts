"use client";

// Minimal shape of the subset of Cashfree Checkout's browser API this app
// actually uses — same approach as razorpay-checkout.ts: no official types
// ship with the CDN script, so only what's called is hand-typed.
export type CashfreeCheckoutResult = {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
};

type CashfreeInstance = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: "_modal" | "_self" | "_blank" | "_top";
  }) => Promise<CashfreeCheckoutResult>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeInstance;
  }
}

const SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";
let loadPromise: Promise<void> | undefined;

/** Injects Cashfree Checkout's script tag once per page load and resolves when it's ready. */
function loadCashfreeScript(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree Checkout"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

/**
 * Loads Cashfree Checkout and opens it as a modal for the given payment
 * session. `mode` must match the environment the session was created in
 * (CASHFREE_ENV) — sandbox sessions can't be opened in production mode.
 */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  mode: "sandbox" | "production",
): Promise<CashfreeCheckoutResult> {
  await loadCashfreeScript();
  if (!window.Cashfree) throw new Error("Cashfree Checkout script did not load correctly.");

  const cashfree = window.Cashfree({ mode });
  return cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });
}
