"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function QuickSearchForm({
  cities,
  categories,
  compact = false,
}: {
  cities: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  /** Smaller footprint for embedding in the navbar, vs. the full hero size. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [city, setCity] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (city && category) router.push(`/${city}/${category}`);
    else if (city) router.push(`/${city}`);
    else if (category) router.push(`/categories/${category}`);
    else router.push("/search");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "flex w-full max-w-xl items-center gap-1 rounded-full border bg-card p-1 shadow-sm"
          : "flex w-full max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row"
      }
    >
      <Select value={city ?? undefined} onValueChange={setCity}>
        <SelectTrigger
          size={compact ? "sm" : "default"}
          className={
            compact ? "flex-1 border-none shadow-none" : "w-full border-none shadow-none sm:flex-1"
          }
        >
          <SelectValue placeholder="City">
            {(value: string | null) => cities.find((c) => c.slug === value)?.name ?? "City"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={category ?? undefined} onValueChange={setCategory}>
        <SelectTrigger
          size={compact ? "sm" : "default"}
          className={
            compact ? "flex-1 border-none shadow-none" : "w-full border-none shadow-none sm:flex-1"
          }
        >
          <SelectValue placeholder="Service">
            {(value: string | null) => categories.find((c) => c.slug === value)?.name ?? "Service"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="submit"
        size={compact ? "icon-sm" : "lg"}
        className={compact ? "shrink-0 rounded-full" : "gap-2"}
      >
        <Search className="size-4" aria-hidden="true" />
        {!compact && "Search"}
      </Button>
    </form>
  );
}
