import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-accent-foreground uppercase">
        Beauty & Banquets, near you
      </p>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Find and book trusted beauty vendors and wedding venues across India
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-balance">
        MakeGlowOver is being built. Check back soon for salons, makeup artists, and banquet halls
        in your city.
      </p>
      <Button size="lg">Explore MakeGlowOver</Button>
    </main>
  );
}
