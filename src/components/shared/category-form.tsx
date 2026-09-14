"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategoryAction, updateCategoryAction } from "@/server/actions/admin";

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "BEAUTY" | "BANQUET";
  isActive: boolean;
  sortOrder: number;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  longDescription: string | null;
};

export function CategoryForm({ category, onDone }: { category?: Category; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [type, setType] = useState<"BEAUTY" | "BANQUET">(category?.type ?? "BEAUTY");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [seoTitle, setSeoTitle] = useState(category?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(category?.seoDescription ?? "");
  const [longDescription, setLongDescription] = useState(category?.longDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const input = {
      name,
      slug,
      type,
      isActive,
      sortOrder: Number(sortOrder),
      imageUrl,
      seoTitle,
      seoDescription,
      longDescription,
    };

    const result = category
      ? await updateCategoryAction(category.id, input)
      : await createCategoryAction(input);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!category) {
      setName("");
      setSlug("");
      setImageUrl("");
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">{category ? `Edit ${category.name}` : "New category"}</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "BEAUTY" | "BANQUET")}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value="BEAUTY">Beauty</option>
          <option value="BANQUET">Banquet</option>
        </select>
        <Input
          placeholder="Sort order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4"
          />
          Active
        </label>
      </div>
      <Input
        placeholder="Image URL (shown on the home page)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <Input
        placeholder="SEO title"
        value={seoTitle}
        onChange={(e) => setSeoTitle(e.target.value)}
      />
      <Input
        placeholder="SEO description"
        value={seoDescription}
        onChange={(e) => setSeoDescription(e.target.value)}
      />
      <Input
        placeholder="Long description (shown on the category landing page)"
        value={longDescription}
        onChange={(e) => setLongDescription(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : category ? "Save changes" : "Create category"}
      </Button>
    </form>
  );
}
