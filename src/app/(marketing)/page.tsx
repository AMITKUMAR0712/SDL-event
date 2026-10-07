import {
  CalendarCheck,
  Check,
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

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { HeroCarousel } from "@/components/shared/hero-carousel";
import { PopularCitiesGrid } from "@/components/shared/popular-cities-grid";
import { QuickSearchForm } from "@/components/shared/quick-search-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categoryPhotoUrl } from "@/lib/category-images";
import { formatPaiseAsINR } from "@/lib/money";
import {
  getMarketplaceStats,
  listActiveCategories,
  listActiveCities,
  listActivePlansWithFeatures,
} from "@/server/repositories/catalog";

// Short instead of the usual hour-long ISR window: the hero's Cities/Verified
// vendors/Banquets counts should reflect a vendor or banquet going live
// within moments, not sit stale for up to an hour.
export const revalidate = 30;

// NCR + other major metros surface first in "Popular cities" instead of
// whatever sorts first alphabetically (Agartala, Agra, ...) — these are the
// cities most visitors are actually searching for.
const PRIORITY_CITY_SLUGS = [
  "new-delhi",
  "noida",
  "greater-noida",
  "ghaziabad",
  "gurugram",
  "faridabad",
  "mumbai",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
] as const;

function sortCitiesByPriority<T extends { slug: string }>(cities: T[]): T[] {
  const rank = (slug: string) => {
    const i = PRIORITY_CITY_SLUGS.indexOf(slug as (typeof PRIORITY_CITY_SLUGS)[number]);
    return i === -1 ? PRIORITY_CITY_SLUGS.length : i;
  };
  return [...cities].sort((a, b) => rank(a.slug) - rank(b.slug));
}

const PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "per month",
  QUARTERLY: "for 3 months",
  HALF_YEARLY: "for 6 months",
  YEARLY: "for 12 months",
};

type PricingPlan = Awaited<ReturnType<typeof listActivePlansWithFeatures>>[number];

function PlanPricingGrid({ plans }: { plans: PricingPlan[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <p className="font-heading text-xl">{plan.name}</p>
            <p className="mt-2">
              <span className="font-heading text-3xl">{formatPaiseAsINR(plan.pricePaise)}</span>
              <span className="text-sm text-muted-foreground">
                {" "}
                {PERIOD_LABEL[plan.billingPeriod] ?? ""}
              </span>
            </p>
            {plan.description && (
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            )}
            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {feature.label}
                </li>
              ))}
            </ul>
            <Link href="/register" className={`${buttonVariants()} mt-6 w-full`}>
              Get started
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [cities, categories, stats, vendorPlans, banquetPlans] = await Promise.all([
    listActiveCities(),
    listActiveCategories(),
    getMarketplaceStats(),
    listActivePlansWithFeatures("VENDOR"),
    listActivePlansWithFeatures("BANQUET"),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative isolate">
        <HeroCarousel
          images={categories
            .slice(0, 6)
            .map((c) => ({ url: categoryPhotoUrl(c.slug, 0), alt: c.name }))}
        />

        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center sm:gap-6 sm:py-24">
          <p className="flex items-center gap-2 text-sm font-medium tracking-wide text-primary uppercase">
            <Sparkles className="size-4" aria-hidden="true" />
            Beauty Parlour & Banquets, near you
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Find and book trusted beauty parlours and banquets for weddings & parties across India
          </h1>
          <p className="max-w-xl text-base text-muted-foreground text-balance sm:text-lg">
            Compare verified salons, makeup artists, and banquet halls near you — real ratings,
            instant booking.
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
              All Services
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
                <dd className="font-heading text-2xl">
                  <AnimatedCounter target={stats.cities} />+
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Verified vendors</dt>
                <dd className="font-heading text-2xl">
                  <AnimatedCounter target={stats.vendors} />+
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Banquets</dt>
                <dd className="font-heading text-2xl">
                  <AnimatedCounter target={stats.banquets} />+
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Why SajDhajLo */}
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
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-2">
        <Card className="h-full">
          <CardContent className="flex h-full flex-col p-8">
            <Scissors className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl">For customers</h2>
            <p className="mt-2 text-muted-foreground">
              Discover bridal makeup artists, salons, and banquet halls near you. Compare prices,
              read real reviews, and book — all in one place.
            </p>
            <Link href="/search" className={`${buttonVariants()} mt-auto self-start`}>
              Start exploring
            </Link>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardContent className="flex h-full flex-col p-8">
            <Store className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl">For Beauty Parlours & Banquet Owners</h2>
            <p className="mt-2 text-muted-foreground">
              List your salon, studio, or venue and reach customers actively searching in your city.
              Manage bookings, availability, and payouts from one dashboard.
            </p>
            <Link
              href="/register"
              className={`${buttonVariants({ variant: "outline" })} mt-auto self-start`}
            >
              List your business
            </Link>
          </CardContent>
        </Card>
      </section>

      {(vendorPlans.length > 0 || banquetPlans.length > 0) && (
        <section id="pricing" className="scroll-mt-20 bg-accent/30 py-16">
          <div className="mx-auto w-full max-w-5xl px-6">
            <h2 className="text-center font-heading text-2xl">Pricing for vendors</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Pick a plan and start receiving client leads near you.
            </p>

            {vendorPlans.length > 0 && (
              <div className="mt-10">
                <h3 className="font-heading text-lg text-muted-foreground">
                  Beauty Parlour & Salons
                </h3>
                <PlanPricingGrid plans={vendorPlans} />
              </div>
            )}

            {banquetPlans.length > 0 && (
              <div className="mt-10">
                <h3 className="font-heading text-lg text-muted-foreground">
                  Banquets for Weddings & Parties
                </h3>
                <PlanPricingGrid plans={banquetPlans} />
              </div>
            )}
          </div>
        </section>
      )}

      {cities.length > 0 && (
        <section id="cities" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-12">
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <MapPin className="size-5 text-primary" aria-hidden="true" />
            Popular cities
          </h2>
          <PopularCitiesGrid cities={sortCitiesByPriority(cities)} />
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            Popular categories
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categories.slice(0, 12).map((category) => (
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
        </section>
      )}
    </main>
  );
}
