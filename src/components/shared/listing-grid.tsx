import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchResult } from "@/server/services/search";

export function ListingGrid({
  items,
  type,
  nextHref,
}: {
  items: SearchResult["items"];
  type: "vendor" | "banquet";
  teaserDiscount?: SearchResult["teaserDiscount"];
  nextHref?: string;
}) {
  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <Link href={`/${type}/${item.slug}`}>
              {item.image && (
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.name}</p>
                  {/* Every listing here is published, which only happens once KYC is
                      approved and a subscription payment has actually captured — so
                      this badge is simply stating a fact, not a marketing flourish. */}
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.cityName}</p>
                <p className="text-sm">
                  ★ {item.ratingAvg.toFixed(1)} ({item.ratingCount})
                </p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {nextHref && (
        <div className="mt-8 text-center">
          <Link href={nextHref} className={buttonVariants({ variant: "outline" })}>
            Load more
          </Link>
        </div>
      )}
    </>
  );
}
