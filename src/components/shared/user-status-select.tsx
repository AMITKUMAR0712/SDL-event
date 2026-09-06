"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setUserStatusAction } from "@/server/actions/admin";

const STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;

export function UserStatusSelect({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    setPending(true);
    await setUserStatusAction(userId, next as "ACTIVE" | "SUSPENDED" | "BANNED");
    setPending(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
