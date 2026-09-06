"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  approveBanquetKycAction,
  approveVendorKycAction,
  rejectBanquetKycAction,
  rejectVendorKycAction,
} from "@/server/actions/admin";

export function KycActions({ type, id }: { type: "VENDOR" | "BANQUET"; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setPending(action);
    const fn =
      type === "VENDOR"
        ? action === "approve"
          ? approveVendorKycAction
          : rejectVendorKycAction
        : action === "approve"
          ? approveBanquetKycAction
          : rejectBanquetKycAction;
    await fn(id);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending !== null} onClick={() => act("approve")}>
        {pending === "approve" ? "..." : "Approve"}
      </Button>
      <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => act("reject")}>
        {pending === "reject" ? "..." : "Reject"}
      </Button>
    </div>
  );
}
