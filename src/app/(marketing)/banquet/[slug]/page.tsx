import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ContactRevealButton } from "@/components/shared/contact-reveal-button";
import { EnquireBanquetForm } from "@/components/shared/enquire-banquet-form";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, pageDescription, pageTitle } from "@/lib/seo";
import {
  findBanquetOwnerBySlug,
  getApprovedReviewsFor,
  getBanquetBySlug,
  getMediaFor,
} from "@/server/repositories/listings";
import { syncPublishStatusForUser } from "@/server/services/subscription";

export async function generateMetadata(props: PageProps<"/banquet/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const banquet = await getBanquetBySlug(slug);
  if (!banquet) return {};

  const title = pageTitle(`${banquet.venueName} — ${banquet.city.name}`);
  const description = pageDescription(
    banquet.about ??
      `Book ${banquet.venueName} in ${banquet.city.name} on SajDhajLo — halls, pricing, and availability.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/banquet/${banquet.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function BanquetProfilePage(props: PageProps<"/banquet/[slug]">) {
  const { slug } = await props.params;

  const owner = await findBanquetOwnerBySlug(slug);
  if (owner) await syncPublishStatusForUser(owner.userId);

  const banquet = await getBanquetBySlug(slug);
  if (!banquet) notFound();

  const [media, reviews] = await Promise.all([
    getMediaFor("BANQUET", banquet.id),
    getApprovedReviewsFor("BANQUET", banquet.id),
  ]);

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: banquet.city.name, path: `/${banquet.city.slug}` },
      ...(banquet.primaryCategory
        ? [
            {
              name: banquet.primaryCategory.name,
              path: `/${banquet.city.slug}/${banquet.primaryCategory.slug}`,
            },
          ]
        : []),
      { name: banquet.venueName, path: `/banquet/${banquet.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "EventVenue",
      name: banquet.venueName,
      description: banquet.about ?? undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: banquet.city.name,
        addressCountry: "IN",
      },
      ...(banquet.ratingCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(banquet.ratingAvg),
              reviewCount: banquet.ratingCount,
            },
          }
        : {}),
      hasPart: {
        "@type": "WebPageElement",
        isAccessibleForFree: false,
        cssSelector: "#gated-contact",
      },
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="font-heading text-3xl">{banquet.venueName}</h1>
      <p className="text-muted-foreground">
        {banquet.locality?.name ? `${banquet.locality.name}, ` : ""}
        {banquet.city.name} · ★ {Number(banquet.ratingAvg).toFixed(1)} ({banquet.ratingCount}{" "}
        reviews)
      </p>

      {banquet.about && <p className="mt-4">{banquet.about}</p>}

      {media.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={m.url}
                alt={m.alt ?? banquet.venueName}
                fill
                sizes="(min-width: 768px) 256px, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 font-heading text-xl">Halls</h2>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {banquet.halls.map((h) => (
          <li key={h.id} className="p-3 text-sm">
            {h.name} · up to {h.seatingCapacity ?? h.floatingCapacity} guests
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <EnquireBanquetForm banquetId={banquet.id} />
      </div>

      <div id="gated-contact" className="mt-8 rounded-lg border border-border p-4">
        <h2 className="font-heading text-xl">Contact</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exact contact details are shown to signed-in customers, within their monthly quota.
        </p>
        <div className="mt-3">
          <ContactRevealButton targetType="BANQUET" targetId={banquet.id} />
        </div>
      </div>

      {reviews.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-xl">Reviews</h2>
          <div className="mt-2 space-y-3">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium">
                    {r.author.name ?? "Customer"} · ★ {r.rating}
                  </p>
                  {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
