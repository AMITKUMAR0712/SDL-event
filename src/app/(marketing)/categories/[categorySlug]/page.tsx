import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbJsonLd, pageDescription, pageTitle } from "@/lib/seo";
import {
  findCategoryBySlug,
  listActiveCategories,
  listCitiesWithListingsInCategory,
} from "@/server/repositories/catalog";

export async function generateStaticParams() {
  const categories = await listActiveCategories();
  return categories.map((category) => ({ categorySlug: category.slug }));
}

export async function generateMetadata(
  props: PageProps<"/categories/[categorySlug]">,
): Promise<Metadata> {
  const { categorySlug } = await props.params;
  const category = await findCategoryBySlug(categorySlug);
  if (!category) return {};

  const title = pageTitle(category.seoTitle ?? `${category.name} Near You`);
  const description = pageDescription(
    category.seoDescription ?? `Find and book the best ${category.name.toLowerCase()} near you.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryHubPage(props: PageProps<"/categories/[categorySlug]">) {
  const { categorySlug } = await props.params;
  const category = await findCategoryBySlug(categorySlug);
  if (!category || !category.isActive) notFound();

  const cities = await listCitiesWithListingsInCategory(category.id, category.type);

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: category.name, path: `/categories/${category.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> {category.name}
      </nav>

      <h1 className="mt-2 font-heading text-3xl">{category.name} Near You</h1>

      {category.longDescription && (
        <p className="mt-4 text-muted-foreground">{category.longDescription}</p>
      )}

      {cities.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-heading text-xl">Available in these cities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}/${category.slug}`}
                  className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-8 text-muted-foreground">
          No published listings for {category.name} yet — check back soon.
        </p>
      )}
    </main>
  );
}
