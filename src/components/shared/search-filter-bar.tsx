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
  const [city, setCity] = useState<string | null>(initial.city ?? null);
  const [category, setCategory] = useState<string | null>(initial.category ?? null);
  const [homeService, setHomeService] = useState(initial.homeService ?? false);

  const categoryOptions = categories.filter(
    (c) => c.type === (type === "banquet" ? "BANQUET" : "BEAUTY"),
  );

  function apply(
    overrides: Partial<{
      type: "vendor" | "banquet";
      city: string | null;
      category: string | null;
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
          setCategory(null);
          apply({ type: next, category: null });
        }}
      >
        <TabsList>
          <TabsTrigger value="vendor">Beauty vendors</TabsTrigger>
          <TabsTrigger value="banquet">Banquet halls</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={city ?? undefined}
          onValueChange={(value) => {
            setCity(value);
            apply({ city: value });
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Any city" />
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
          value={category ?? undefined}
          onValueChange={(value) => {
            setCategory(value);
            apply({ category: value });
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Any category" />
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
              setCity(null);
              setCategory(null);
              apply({ city: null, category: null });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
