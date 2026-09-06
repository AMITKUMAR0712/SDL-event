"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createReviewAction } from "@/server/actions/booking";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await createReviewAction({ bookingId, rating, body });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return <p className="text-sm text-muted-foreground">Thanks for your review!</p>;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={n <= rating ? "text-accent" : "text-muted-foreground"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How was it?"
        className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
        rows={2}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Submitting..." : "Submit review"}
      </Button>
    </div>
  );
}
