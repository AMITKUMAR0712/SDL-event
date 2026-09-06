import { describe, expect, it } from "vitest";

import {
  addPaise,
  formatPaiseAsINR,
  paiseToRupees,
  percentOfPaise,
  rupeesToPaise,
} from "@/lib/money";

describe("money", () => {
  it("converts rupees to paise", () => {
    expect(rupeesToPaise(499)).toBe(49900);
  });

  it("converts paise to rupees", () => {
    expect(paiseToRupees(49900)).toBe(499);
  });

  it("formats paise as INR", () => {
    expect(formatPaiseAsINR(499900)).toBe("₹4,999.00");
  });

  it("adds paise amounts", () => {
    expect(addPaise(10000, 2500, 500)).toBe(13000);
  });

  it("computes a percentage of paise, rounded", () => {
    expect(percentOfPaise(10000, 10)).toBe(1000);
    expect(percentOfPaise(999, 15)).toBe(150);
  });
});
