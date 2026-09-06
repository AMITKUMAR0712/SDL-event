import {
  CalendarCheck,
  Gem,
  MapPin,
  ScanSearch,
  Scissors,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { QuickSearchForm } from "@/components/shared/quick-search-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getMarketplaceStats,
  listActiveCategories,
  listActiveCities,
} from "@/server/repositories/catalog";

export default async function HomePage() {
  const [cities, categories, stats] = await Promise.all([
    listActiveCities(),
    listActiveCategories(),
    getMarketplaceStats(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-6 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 left-6 -z-10 h-72 w-72 rounded-full bg-accent/50 blur-3xl"
        />

        <div className="flex flex-col items-center gap-6 px-6 py-24 text-center">
          <p className="flex items-center gap-2 text-sm font-medium tracking-wide text-primary uppercase">
            <Sparkles className="size-4" aria-hidden="true" />
            Beauty & Banquets, near you
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find and book trusted beauty vendors and wedding venues across India
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-balance">
            Compare verified salons, makeup artists, and banquet halls near you — real ratings,
            transparent pricing, instant booking.
          </p>
          <QuickSearchForm
            cities={cities.map((c) => ({ slug: c.slug, name: c.name }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search"
              className={buttonVariants({ variant: "secondary", className: "font-semibold" })}
            >
              Or browse everything
            </Link>
            <Link
              href="/register"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-2! border-primary! font-semibold! text-primary! hover:bg-primary! hover:text-primary-foreground!",
              })}
            >
              Register as a vendor
            </Link>
          </div>

          {(stats.cities > 0 || stats.vendors > 0 || stats.banquets > 0) && (
            <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Cities</dt>
                <dd className="font-heading text-2xl">{stats.cities}+</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Verified vendors</dt>
                <dd className="font-heading text-2xl">{stats.vendors}+</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Banquet venues</dt>
                <dd className="font-heading text-2xl">{stats.banquets}+</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Why MakeGlowOver */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              title: "KYC-verified",
              body: "Every vendor and venue is reviewed before going live.",
            },
            {
              icon: Wallet,
              title: "Transparent pricing",
              body: "See the full price upfront — no hidden fees at checkout.",
            },
            {
              icon: CalendarCheck,
              title: "Instant booking",
              body: "Pick a slot, pay securely, get confirmed in minutes.",
            },
            {
              icon: Gem,
              title: "Real reviews",
              body: "Ratings from customers who actually booked and paid.",
            },
          ].map((feature) => (
            <Card key={feature.title} className="border-none bg-accent/40 shadow-none">
              <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                <feature.icon className="size-6 text-primary" aria-hidden="true" />
                <p className="font-medium">{feature.title}</p>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-accent/30 py-16">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 className="text-center font-heading text-2xl">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: ScanSearch,
                title: "Search your city",
                body: "Pick a city and the service you need — bridal makeup, salon, or a banquet hall.",
              },
              {
                step: "2",
                icon: ShieldCheck,
                title: "Compare & choose",
                body: "Check real ratings, transparent pricing, and availability from verified listings.",
              },
              {
                step: "3",
                icon: CalendarCheck,
                title: "Book instantly",
                body: "Pick a slot, pay securely, and get confirmed — invoice included.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <item.icon className="size-6" aria-hidden="true" />
                </div>
                <p className="mt-4 font-medium">
                  {item.step}. {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For customers / For vendors */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-16 md:grid-cols-2">
        <Card>
          <CardContent className="p-8">
            <Scissors className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl">For customers</h2>
            <p className="mt-2 text-muted-foreground">
              Discover bridal makeup artists, salons, and banquet halls near you. Compare prices,
              read real reviews, and book — all in one place.
            </p>
            <Link href="/search" className={`${buttonVariants()} mt-6`}>
              Start exploring
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8">
            <Store className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl">For vendors & venue owners</h2>
            <p className="mt-2 text-muted-foreground">
              List your salon, studio, or venue and reach customers actively searching in your city.
              Manage bookings, availability, and payouts from one dashboard.
            </p>
            <Link href="/register" className={`${buttonVariants({ variant: "outline" })} mt-6`}>
              List your business
            </Link>
          </CardContent>
        </Card>
      </section>

      {cities.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 py-12">
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <MapPin className="size-5 text-primary" aria-hidden="true" />
            Popular cities
          </h2>
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
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            Popular categories
          </h2>
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
