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
}: {
  cities: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  // "" (not null/undefined) means "nothing selected" — Select must stay a
  // controlled component for its whole lifetime, so its value prop can
  // never be undefined on the first render and a defined string later.
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

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
      className="flex w-full max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row"
    >
      <Select value={city} onValueChange={(value) => setCity(value ?? "")}>
        <SelectTrigger className="w-full border-none shadow-none sm:flex-1">
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

      <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
        <SelectTrigger className="w-full border-none shadow-none sm:flex-1">
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

      <Button type="submit" size="lg" className="gap-2">
        <Search className="size-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
