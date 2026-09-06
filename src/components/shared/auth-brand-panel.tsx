import { CalendarCheck, Gem, ShieldCheck, Sparkles } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, text: "KYC-verified vendors and venues" },
  { icon: CalendarCheck, text: "Instant, secure booking" },
  { icon: Gem, text: "Real reviews from real customers" },
];

export function AuthBrandPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative isolate hidden flex-col justify-center overflow-hidden bg-primary px-10 py-16 text-primary-foreground lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-10 -z-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-10 -z-10 h-64 w-64 rounded-full bg-white/5 blur-3xl"
      />

      <p className="flex items-center gap-2 text-sm font-medium tracking-wide uppercase opacity-80">
        <Sparkles className="size-4" aria-hidden="true" />
        MakeGlowOver
      </p>
      <h2 className="mt-4 max-w-sm font-heading text-3xl text-balance">{title}</h2>
      <p className="mt-3 max-w-sm text-primary-foreground/80">{body}</p>

      <ul className="mt-8 flex flex-col gap-3">
        {POINTS.map((point) => (
          <li key={point.text} className="flex items-center gap-3 text-sm">
            <point.icon className="size-5 shrink-0" aria-hidden="true" />
            {point.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
