"use client";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Option = { slug: string; name: string; type: "BEAUTY" | "BANQUET" };

export function SearchFilterBar({
  cities,
  categories,
  initial,
}: {
  cities: { slug: string; name: string }[];
  categories: Option[];
  initial: { type: "vendor" | "banquet"; city?: string; category?: string; homeService?: boolean };
}) {
  const router = useRouter();
  const [type, setType] = useState<"vendor" | "banquet">(initial.type);
  // "" (not null/undefined) means "no filter" — Select must stay a
  // controlled component for its whole lifetime, so its value prop can
  // never be undefined on the first render and a defined string later.
  const [city, setCity] = useState(initial.city ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [homeService, setHomeService] = useState(initial.homeService ?? false);

  const categoryOptions = categories.filter(
    (c) => c.type === (type === "banquet" ? "BANQUET" : "BEAUTY"),
  );

  function apply(
    overrides: Partial<{
      type: "vendor" | "banquet";
      city: string;
      category: string;
      homeService: boolean;
    }> = {},
  ) {
    const next = {
      type: overrides.type ?? type,
      city: overrides.city !== undefined ? overrides.city : city,
      category: overrides.category !== undefined ? overrides.category : category,
      homeService: overrides.homeService ?? homeService,
    };
    const params = new URLSearchParams({ type: next.type });
    if (next.city) params.set("city", next.city);
    if (next.category) params.set("category", next.category);
    if (next.homeService) params.set("homeService", "true");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
      <Tabs
        value={type}
        onValueChange={(value) => {
          const next = value as "vendor" | "banquet";
          setType(next);
          setCategory("");
          apply({ type: next, category: "" });
        }}
      >
        <TabsList>
          <TabsTrigger value="vendor">Beauty vendors</TabsTrigger>
          <TabsTrigger value="banquet">Banquet halls</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={city}
          onValueChange={(value) => {
            const next = value ?? "";
            setCity(next);
            apply({ city: next });
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Any city">
              {(value: string | null) => cities.find((c) => c.slug === value)?.name ?? "Any city"}
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

        <Select
          value={category}
          onValueChange={(value) => {
            const next = value ?? "";
            setCategory(next);
            apply({ category: next });
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Any category">
              {(value: string | null) =>
                categoryOptions.find((c) => c.slug === value)?.name ?? "Any category"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {type === "vendor" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={homeService}
              onChange={(e) => {
                const next = e.target.checked;
                setHomeService(next);
                apply({ homeService: next });
              }}
              className="size-4 rounded border-input"
            />
            At-home service
          </label>
        )}

        {(city || category) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCity("");
              setCategory("");
              apply({ city: "", category: "" });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
