import { CityForm } from "@/components/shared/city-form";
import { listAllCities } from "@/server/repositories/admin";
import { listStates } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage() {
  const [cities, states] = await Promise.all([listAllCities(), listStates()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Cities</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cities and their images/SEO content shown on the home page and city landing pages.
      </p>

      <div className="mt-6">
        <CityForm states={states} />
      </div>

      <div className="mt-8 space-y-2">
        {cities.map((city) => (
          <details key={city.id} className="rounded-lg border border-border">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
              <span className="flex items-center gap-2">
                {city.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={city.imageUrl} alt="" className="size-8 rounded object-cover" />
                )}
                {city.name}
                <span className="text-muted-foreground">· {city.state.name}</span>
              </span>
              <span className={city.isActive ? "text-accent-foreground" : "text-muted-foreground"}>
                {city.isActive ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-border p-3">
              <CityForm
                states={states}
                city={{ ...city, lat: Number(city.lat), lng: Number(city.lng) }}
              />
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
