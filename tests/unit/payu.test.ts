import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createPayURequestHash, verifyPayUReturnHash } from "@/server/services/payu";

function hash(value: string): string {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

describe("PayU hosted checkout signatures", () => {
  it("creates the request hash from merchant fields in the required order", () => {
    const actual = createPayURequestHash(
      "merchant-key",
      "merchant-salt",
      "txn-123",
      "125.50",
      "Booking MGO123",
      "Amit",
      "amit@example.com",
    );

    expect(actual).toBe(
      hash("merchant-key|txn-123|125.50|Booking MGO123|Amit|amit@example.com||||||merchant-salt"),
    );
  });

  it("accepts a valid callback hash and rejects tampered payment fields", () => {
    const fields: Record<string, string> = {
      key: "merchant-key",
      txnid: "txn-123",
      amount: "125.50",
      productinfo: "Booking MGO123",
      firstname: "Amit",
      email: "amit@example.com",
      status: "success",
      udf1: "",
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
      udf6: "",
      udf7: "",
      udf8: "",
      udf9: "",
      udf10: "",
    };
    fields.hash = hash(
      [
        "merchant-salt",
        "success",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "amit@example.com",
        "Amit",
        "Booking MGO123",
        "125.50",
        "txn-123",
        "merchant-key",
      ].join("|"),
    );

    expect(verifyPayUReturnHash(fields, "merchant-key", "merchant-salt")).toBe(true);
    expect(
      verifyPayUReturnHash({ ...fields, amount: "1.00" }, "merchant-key", "merchant-salt"),
    ).toBe(false);
    expect(verifyPayUReturnHash(fields, "another-key", "merchant-salt")).toBe(false);
  });

  it("handles additional charges in the callback hash sequence", () => {
    const fields: Record<string, string> = {
      key: "merchant-key",
      txnid: "txn-456",
      amount: "125.50",
      productinfo: "Booking MGO123",
      firstname: "Amit",
      email: "amit@example.com",
      status: "success",
      additional_charges: "2.50",
    };
    fields.hash = hash(
      [
        "2.50",
        "merchant-salt",
        "success",
        ...Array.from({ length: 10 }, () => ""),
        "amit@example.com",
        "Amit",
        "Booking MGO123",
        "125.50",
        "txn-456",
        "merchant-key",
      ].join("|"),
    );

    expect(verifyPayUReturnHash(fields, "merchant-key", "merchant-salt")).toBe(true);
  });
});
