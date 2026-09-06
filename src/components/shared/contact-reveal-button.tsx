"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { revealContactAction } from "@/server/actions/contact-reveal";

export function ContactRevealButton({
  targetType,
  targetId,
}: {
  targetType: "VENDOR" | "BANQUET";
  targetId: string;
}) {
  const [state, setState] = useState<{ phone: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await revealContactAction(targetType, targetId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setState(result.data);
  }

  if (state) {
    return (
      <p className="font-medium">
        {state.phone ? `Call ${state.phone}` : "This vendor hasn't added a phone number yet."}
      </p>
    );
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending}>
        {pending ? "Unlocking..." : "Show contact number"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
