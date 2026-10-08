"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Category = { slug: string; name: string; imageUrl: string | null };

const INITIAL_COUNT = 12;

export function PopularCategoriesGrid({ categories }: { categories: Category[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? categories : categories.slice(0, INITIAL_COUNT);

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="group overflow-hidden rounded-xl border hover:border-primary"
          >
            <div className="relative h-20 w-full bg-accent">
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Sparkles className="size-6 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="p-2 text-center text-sm font-medium">{category.name}</p>
          </Link>
        ))}
      </div>

      {!expanded && categories.length > INITIAL_COUNT && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-input px-5 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-accent active:scale-95"
          >
            Show more categories
          </button>
        </div>
      )}
    </>
  );
}
