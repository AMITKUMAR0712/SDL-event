import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbJsonLd, pageDescription, pageTitle } from "@/lib/seo";
import {
  findCityBySlug,
  listActiveCities,
  listCategoriesWithListingsInCity,
} from "@/server/repositories/catalog";

export async function generateStaticParams() {
  const cities = await listActiveCities();
  return cities.map((city) => ({ citySlug: city.slug }));
}

export async function generateMetadata(props: PageProps<"/[citySlug]">): Promise<Metadata> {
  const { citySlug } = await props.params;
  const city = await findCityBySlug(citySlug);
  if (!city) return {};

  const title = pageTitle(city.seoTitle ?? `Beauty & Banquet Services in ${city.name}`);
  const description = pageDescription(
    city.seoDescription ??
      `Discover verified beauty vendors and banquet venues in ${city.name} on MakeGlowOver.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityHubPage(props: PageProps<"/[citySlug]">) {
  const { citySlug } = await props.params;
  const city = await findCityBySlug(citySlug);
  if (!city || !city.isActive) notFound();

  const categories = await listCategoriesWithListingsInCity(city.id);
  const beautyCategories = categories.filter((c) => c.type === "BEAUTY");
  const banquetCategories = categories.filter((c) => c.type === "BANQUET");

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: city.name, path: `/${city.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> {city.name}
      </nav>

      <h1 className="mt-2 font-heading text-3xl">Beauty & Banquet Services in {city.name}</h1>

      {city.introContent && <p className="mt-4 text-muted-foreground">{city.introContent}</p>}

      {beautyCategories.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-xl">Beauty services in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {beautyCategories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${city.slug}/${category.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {banquetCategories.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-xl">Venues in {city.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {banquetCategories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${city.slug}/${category.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No published listings in {city.name} yet — check back soon, or{" "}
          <Link href="/search" className="underline">
            browse all cities
          </Link>
          .
        </p>
      )}
    </main>
  );
}
