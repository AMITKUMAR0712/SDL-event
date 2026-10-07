"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type City = { slug: string; name: string; imageUrl: string | null };

const INITIAL_COUNT = 12;

export function PopularCitiesGrid({ cities }: { cities: City[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? cities : cities.slice(0, INITIAL_COUNT);

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((city) => (
          <Link
            key={city.slug}
            href={`/${city.slug}`}
            className="group overflow-hidden rounded-xl border hover:border-primary"
          >
            <div className="relative h-20 w-full bg-accent">
              {city.imageUrl ? (
                // Admin-provided URLs aren't on next/image's allowed-host list.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={city.imageUrl}
                  alt={city.name}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <MapPin className="size-6 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="p-2 text-center text-sm font-medium">{city.name}</p>
          </Link>
        ))}
      </div>

      {!expanded && cities.length > INITIAL_COUNT && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-input px-5 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-accent active:scale-95"
          >
            Show more cities
          </button>
        </div>
      )}
    </>
  );
}
