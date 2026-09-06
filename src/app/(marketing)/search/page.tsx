import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getGateContext } from "@/lib/gate";
import { formatPaiseAsINR } from "@/lib/money";
import { searchParamsSchema } from "@/schemas/search";
import { runSearch } from "@/server/services/search";

export default async function SearchPage(props: PageProps<"/search">) {
  const rawParams = await props.searchParams;
  const parsed = searchParamsSchema.safeParse({
    type: rawParams.type,
    city: rawParams.city,
    category: rawParams.category,
    homeService: rawParams.homeService,
    ratingMin: rawParams.ratingMin,
    cursor: rawParams.cursor,
  });
  const params = parsed.success ? parsed.data : { type: "vendor" as const };

  const gate = await getGateContext();
  const result = await runSearch(params, gate);
  const basePath = `/search?type=${params.type}${params.city ? `&city=${params.city}` : ""}${
    params.category ? `&category=${params.category}` : ""
  }`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-heading text-3xl">
        {params.type === "banquet" ? "Banquet halls" : "Beauty vendors"} near you
      </h1>
      <p className="mt-2 text-muted-foreground">{result.items.length} results</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item) =>
          item.locked ? (
            <Card key={item.id} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="pointer-events-none select-none blur-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.cityName}</p>
                  <p className="text-sm">
                    ★ {item.ratingAvg.toFixed(1)} ({item.ratingCount})
                  </p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-4 text-center">
                  <p className="text-sm font-medium">
                    More {params.type === "banquet" ? "venues" : "vendors"} nearby
                    {result.teaserDiscount && ` — unlock and save ${result.teaserDiscount.label}`}
                  </p>
                  <Link href="/register" className={buttonVariants({ size: "sm" })}>
                    Unlock full access
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={item.id}>
              <Link href={`/${params.type}/${item.slug}`}>
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
                  {item.fromPricePaise !== null && (
                    <p className="mt-1 text-sm font-medium">
                      From {formatPaiseAsINR(item.fromPricePaise)}
                    </p>
                  )}
                </CardContent>
              </Link>
            </Card>
          ),
        )}
      </div>

      {result.nextCursor && (
        <div className="mt-8 text-center">
          <Link
            href={`${basePath}&cursor=${result.nextCursor}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Load more
          </Link>
        </div>
      )}
    </main>
  );
}
