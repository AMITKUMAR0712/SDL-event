"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { deleteContactMessageAction } from "@/server/actions/admin";

export function DeleteMessageButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this message?")) return;
    setPending(true);
    await deleteContactMessageAction(id);
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
