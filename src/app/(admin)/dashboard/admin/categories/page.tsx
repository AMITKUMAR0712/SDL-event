import { CategoryForm } from "@/components/shared/category-form";
import { listAllCategories } from "@/server/repositories/admin";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listAllCategories();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Categories and their images/SEO content shown on the home page and category landing pages.
      </p>

      <div className="mt-6">
        <CategoryForm />
      </div>

      <div className="mt-8 space-y-2">
        {categories.map((category) => (
          <details key={category.id} className="rounded-lg border border-border">
            <summary className="flex cursor-pointer items-center justify-between p-3 text-sm">
              <span className="flex items-center gap-2">
                {category.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={category.imageUrl} alt="" className="size-8 rounded object-cover" />
                )}
                {category.name}
                <span className="text-muted-foreground">· {category.type}</span>
              </span>
              <span
                className={category.isActive ? "text-accent-foreground" : "text-muted-foreground"}
              >
                {category.isActive ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-border p-3">
              <CategoryForm category={category} />
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
