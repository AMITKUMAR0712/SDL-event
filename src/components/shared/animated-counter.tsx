"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to `target` once it scrolls into view — plain
 * IntersectionObserver + requestAnimationFrame, no new dependency (same
 * pattern as the footer's FadeInSection), per CLAUDE.md §3.
 */
export function AnimatedCounter({
  target,
  duration = 1200,
}: {
  target: number;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - progress) ** 3; // ease-out cubic
          setValue(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{value}</span>;
}
