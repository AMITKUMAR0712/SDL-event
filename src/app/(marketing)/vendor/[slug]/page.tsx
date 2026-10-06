import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookVendorForm } from "@/components/shared/book-vendor-form";
import { ContactRevealButton } from "@/components/shared/contact-reveal-button";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, pageDescription, pageTitle } from "@/lib/seo";
import {
  findVendorOwnerBySlug,
  getApprovedReviewsFor,
  getMediaFor,
  getVendorBySlug,
  incrementVendorViewCount,
  similarVendorsNearby,
} from "@/server/repositories/listings";
import { syncPublishStatusForUser } from "@/server/services/subscription";

export async function generateMetadata(props: PageProps<"/vendor/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};

  const title = pageTitle(`${vendor.businessName} — ${vendor.city.name}`);
  const description = pageDescription(
    vendor.about ??
      `Book ${vendor.businessName} in ${vendor.city.name} on SajDhajLo — ratings, pricing, and instant booking.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/vendor/${vendor.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: vendor.coverImage ? [vendor.coverImage] : undefined,
    },
  };
}

export default async function VendorProfilePage(props: PageProps<"/vendor/[slug]">) {
  const { slug } = await props.params;

  const owner = await findVendorOwnerBySlug(slug);
  if (owner) await syncPublishStatusForUser(owner.userId);

  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const [media, reviews, similar] = await Promise.all([
    getMediaFor("VENDOR", vendor.id),
    getApprovedReviewsFor("VENDOR", vendor.id),
    similarVendorsNearby(vendor.id, vendor.cityId, vendor.primaryCategoryId),
  ]);

  incrementVendorViewCount(vendor.id).catch(() => {});

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: vendor.city.name, path: `/${vendor.city.slug}` },
      ...(vendor.primaryCategory
        ? [
            {
              name: vendor.primaryCategory.name,
              path: `/${vendor.city.slug}/${vendor.primaryCategory.slug}`,
            },
          ]
        : []),
      { name: vendor.businessName, path: `/vendor/${vendor.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "BeautySalon",
      name: vendor.businessName,
      description: vendor.about ?? undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: vendor.city.name,
        addressRegion: vendor.city.stateId,
        addressCountry: "IN",
      },
      ...(vendor.ratingCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(vendor.ratingAvg),
              reviewCount: vendor.ratingCount,
            },
          }
        : {}),
      makesOffer: vendor.services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title },
        price: s.pricePaise / 100,
        priceCurrency: "INR",
      })),
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

      {vendor.coverImage && (
        <div className="relative h-56 w-full overflow-hidden rounded-xl">
          <Image
            src={vendor.coverImage}
            alt={vendor.businessName}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="mt-6 font-heading text-3xl">{vendor.businessName}</h1>
      <p className="text-muted-foreground">
        {vendor.locality?.name ? `${vendor.locality.name}, ` : ""}
        {vendor.city.name} · ★ {Number(vendor.ratingAvg).toFixed(1)} ({vendor.ratingCount} reviews)
      </p>

      {vendor.about && <p className="mt-4">{vendor.about}</p>}

      {media.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={m.url}
                alt={m.alt ?? vendor.businessName}
                fill
                sizes="(min-width: 768px) 256px, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 font-heading text-xl">Services</h2>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {vendor.services.map((s) => (
          <li key={s.id} className="p-3 text-sm">
            {s.title}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <BookVendorForm
          vendorId={vendor.id}
          services={vendor.services.map((s) => ({
            id: s.id,
            title: s.title,
            pricePaise: s.pricePaise,
            mode: s.mode,
          }))}
        />
      </div>

      <div id="gated-contact" className="mt-8 rounded-lg border border-border p-4">
        <h2 className="font-heading text-xl">Contact</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exact contact details are shown to signed-in customers, within their monthly quota.
        </p>
        <div className="mt-3">
          <ContactRevealButton targetType="VENDOR" targetId={vendor.id} />
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

      {similar.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-xl">Similar vendors nearby</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {similar.map((v) => (
              <Link
                key={v.slug}
                href={`/vendor/${v.slug}`}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                {v.businessName}
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
