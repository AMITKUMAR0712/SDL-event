"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground ${className ?? ""}`}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back
    </button>
  );
}
