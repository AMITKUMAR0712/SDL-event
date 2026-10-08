"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUploadField } from "@/components/shared/image-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCityAction, deleteCityAction, updateCityAction } from "@/server/actions/admin";

type City = {
  id: string;
  name: string;
  slug: string;
  stateId: string;
  lat: number | string;
  lng: number | string;
  isActive: boolean;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  introContent: string | null;
};

export function CityForm({
  states,
  city,
  onDone,
}: {
  states: { id: string; name: string }[];
  city?: City;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(city?.name ?? "");
  const [slug, setSlug] = useState(city?.slug ?? "");
  const [stateId, setStateId] = useState(city?.stateId ?? states[0]?.id ?? "");
  const [lat, setLat] = useState(String(city?.lat ?? ""));
  const [lng, setLng] = useState(String(city?.lng ?? ""));
  const [isActive, setIsActive] = useState(city?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(city?.imageUrl ?? "");
  const [seoTitle, setSeoTitle] = useState(city?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(city?.seoDescription ?? "");
  const [introContent, setIntroContent] = useState(city?.introContent ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const input = {
      name,
      slug,
      stateId,
      lat: Number(lat),
      lng: Number(lng),
      isActive,
      imageUrl,
      seoTitle,
      seoDescription,
      introContent,
    };

    const result = city ? await updateCityAction(city.id, input) : await createCityAction(input);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!city) {
      setName("");
      setSlug("");
      setLat("");
      setLng("");
      setImageUrl("");
    }
    onDone?.();
    router.refresh();
  }

  async function remove() {
    if (!city) return;
    if (!window.confirm(`Delete "${city.name}"? It will be hidden from the site immediately.`)) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await deleteCityAction(city.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">{city ? `Edit ${city.name}` : "New city"}</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <select
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4"
          />
          Active
        </label>
        <Input
          placeholder="Latitude"
          type="number"
          step="any"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <Input
          placeholder="Longitude"
          type="number"
          step="any"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
        />
      </div>
      <ImageUploadField value={imageUrl} onChange={setImageUrl} label="City image" />
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
        placeholder="Intro content (shown on the city landing page)"
        value={introContent}
        onChange={(e) => setIntroContent(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : city ? "Save changes" : "Create city"}
        </Button>
        {city && (
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
