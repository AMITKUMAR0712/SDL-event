"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DISMISSED_KEY_PREFIX = "popup-video-shown:";

function shouldShow(url: string): boolean {
  if (typeof window === "undefined") return false;
  const key = `${DISMISSED_KEY_PREFIX}${url}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable (private mode, etc.) — just show it every load
  }
  return true;
}

export function PopupVideoModal({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(() => shouldShow(url));
  const [broken, setBroken] = useState(false);

  if (broken) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || "Welcome to SajDhajLo"}</DialogTitle>
        </DialogHeader>
        <video
          src={url}
          controls
          autoPlay
          muted
          onError={() => setBroken(true)}
          className="w-full rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
}
