import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { env } from "@/lib/env";

const payUReturnSchema = z.object({
  key: z.string().min(1),
  txnid: z.string().min(1),
  amount: z.string().min(1),
  productinfo: z.string(),
  firstname: z.string(),
  email: z.string(),
  status: z.string().min(1),
  hash: z.string().min(1),
  udf1: z.string().optional().default(""),
  udf2: z.string().optional().default(""),
  udf3: z.string().optional().default(""),
  udf4: z.string().optional().default(""),
  udf5: z.string().optional().default(""),
  udf6: z.string().optional().default(""),
  udf7: z.string().optional().default(""),
  udf8: z.string().optional().default(""),
  udf9: z.string().optional().default(""),
  udf10: z.string().optional().default(""),
  additional_charges: z.string().optional(),
});

const payUTransactionSchema = z
  .object({
    status: z.string(),
    txnid: z.string(),
    mihpayid: z.union([z.string(), z.number().int()]).transform(String).optional(),
    amt: z.union([z.string(), z.number()]).transform(String).optional(),
    amount: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .passthrough();

const payUVerifyResponseSchema = z.object({
  status: z.union([z.literal(1), z.literal("1")]),
  transaction_details: z.record(z.string(), payUTransactionSchema),
});

export type PayUCheckout = {
  url: string;
  fields: Record<string, string>;
};

type PayUCheckoutInput = {
  txnId: string;
  amountPaise: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
};

export type PayUVerifiedTransaction =
  | { status: "success"; txnId: string; paymentId: string; amountPaise: number }
  | { status: "failed" | "pending"; txnId: string };

function sha512(value: string): string {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

function requiredCredentials() {
  if (!env.PAYU_KEY || !env.PAYU_SALT) {
    throw new Error("PayU is not configured (PAYU_KEY/PAYU_SALT missing).");
  }
  return { key: env.PAYU_KEY, salt: env.PAYU_SALT };
}

function constantTimeHexEqual(actual: string, expected: string): boolean {
  if (!/^[a-f\d]{128}$/i.test(actual) || !/^[a-f\d]{128}$/i.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function formatPaise(amountPaise: number): string {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    throw new Error("Amount must be at least 100 paise (₹1).");
  }
  return `${Math.floor(amountPaise / 100)}.${String(amountPaise % 100).padStart(2, "0")}`;
}

function amountToPaise(amount: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  const total = rupees * 100 + paise;
  return Number.isSafeInteger(total) ? total : null;
}

export function createPayURequestHash(
  key: string,
  salt: string,
  txnId: string,
  amount: string,
  productInfo: string,
  firstName: string,
  email: string,
  udf: readonly string[] = ["", "", "", "", ""],
): string {
  if (udf.length !== 5) throw new Error("PayU requires exactly five UDF values.");
  return sha512([key, txnId, amount, productInfo, firstName, email, ...udf, salt].join("|"));
}

export function verifyPayUReturnHash(
  values: Record<string, string>,
  key: string,
  salt: string,
): boolean {
  const parsed = payUReturnSchema.safeParse(values);
  if (!parsed.success || parsed.data.key !== key) return false;

  const response = parsed.data;
  const reverseHashFields = [
    response.status,
    response.udf10,
    response.udf9,
    response.udf8,
    response.udf7,
    response.udf6,
    response.udf5,
    response.udf4,
    response.udf3,
    response.udf2,
    response.udf1,
    response.email,
    response.firstname,
    response.productinfo,
    response.amount,
    response.txnid,
    response.key,
  ];
  const hashInput = response.additional_charges
    ? [response.additional_charges, salt, ...reverseHashFields].join("|")
    : [salt, ...reverseHashFields].join("|");
  return constantTimeHexEqual(response.hash, sha512(hashInput));
}

export function verifyPayUReturn(values: Record<string, string>): boolean {
  const { key, salt } = requiredCredentials();
  return verifyPayUReturnHash(values, key, salt);
}

export function createPayUCheckout(input: PayUCheckoutInput): PayUCheckout {
  const { key, salt } = requiredCredentials();
  const amount = formatPaise(input.amountPaise);
  const fields: Record<string, string> = {
    key,
    txnid: input.txnId,
    amount,
    productinfo: input.productInfo,
    firstname: input.firstName,
    email: input.email,
    phone: input.phone,
    surl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/payments/payu/callback`,
    furl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/payments/payu/callback`,
    udf1: "",
    udf2: "",
    udf3: "",
    udf4: "",
    udf5: "",
  };
  fields.hash = createPayURequestHash(
    key,
    salt,
    input.txnId,
    amount,
    input.productInfo,
    input.firstName,
    input.email,
  );

  return {
    url:
      env.PAYU_ENV === "PRODUCTION"
        ? "https://secure.payu.in/_payment"
        : "https://test.payu.in/_payment",
    fields,
  };
}

export async function verifyPayUTransaction(txnId: string): Promise<PayUVerifiedTransaction> {
  const { key, salt } = requiredCredentials();
  const verifyUrl =
    env.PAYU_ENV === "PRODUCTION"
      ? "https://info.payu.in/merchant/postservice.php?form=2"
      : "https://test.payu.in/merchant/postservice.php?form=2";
  const body = new URLSearchParams({
    key,
    command: "verify_payment",
    var1: txnId,
    hash: sha512(`${key}|verify_payment|${txnId}|${salt}`),
  });
  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`PayU verification returned HTTP ${response.status}.`);
  }

  const parsedResponse = payUVerifyResponseSchema.safeParse(await response.json());
  if (!parsedResponse.success) {
    throw new Error("PayU verification returned an invalid response.");
  }
  const transaction = parsedResponse.data.transaction_details[txnId];
  if (!transaction || transaction.txnid !== txnId) {
    throw new Error("PayU verification did not return the requested transaction.");
  }

  if (transaction.status.toLowerCase() === "success") {
    const amountPaise = amountToPaise(transaction.amt ?? transaction.amount ?? "");
    if (!transaction.mihpayid || amountPaise === null) {
      throw new Error("PayU verification did not return valid payment details.");
    }
    return { status: "success", txnId, paymentId: transaction.mihpayid, amountPaise };
  }
  if (transaction.status.toLowerCase() === "failure") {
    return { status: "failed", txnId };
  }
  return { status: "pending", txnId };
}
