"use client";

import { useEffect, useState } from "react";

/**
 * Auto-advancing background image carousel for the hero section, with dot
 * navigation. Hand-built rather than pulling in a carousel library — the only
 * behavior needed (auto-advance + click-a-dot) doesn't justify a new
 * dependency per CLAUDE.md §3. The caller passes one real photo per
 * category (see @/lib/category-images) rather than Category.imageUrl, which
 * is a small placeholder graphic unsuited to a full-bleed hero background.
 */
export function HeroCarousel({ images }: { images: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 4500);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      {images.map((image, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image.url}
          src={image.url}
          alt=""
          className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-background/60" />

      {images.length > 1 && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              aria-label={`Show ${image.alt}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary" : "w-1.5 bg-primary/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
