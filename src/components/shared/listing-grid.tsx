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
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </div>
              )}
              <CardContent className="p-4">
                <p className="font-medium">{item.name}</p>
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
