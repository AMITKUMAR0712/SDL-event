import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { listActiveCategories, listActiveCities } from "@/server/repositories/catalog";

export default async function HomePage() {
  const [cities, categories] = await Promise.all([listActiveCities(), listActiveCategories()]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <p className="text-sm font-medium tracking-wide text-accent-foreground uppercase">
          Beauty & Banquets, near you
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Find and book trusted beauty vendors and wedding venues across India
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-balance">
          Compare verified salons, makeup artists, and banquet halls near you — real ratings,
          transparent pricing, instant booking.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/search" className={buttonVariants({ size: "lg" })}>
            Explore MakeGlowOver
          </Link>
          <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Register as a vendor
          </Link>
        </div>
      </section>

      {cities.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 py-12">
          <h2 className="font-heading text-2xl">Popular cities</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {cities.slice(0, 12).map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <h2 className="font-heading text-2xl">Popular categories</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {categories.slice(0, 12).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
