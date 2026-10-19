import type { Metadata } from "next";
import { getCategories } from "@/lib/db/catalog";
import { CategoryCard } from "@/components/categories/CategoryCard";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse the DASDUM collection by category.",
};

// Categories are admin-managed rows in MySQL — see the note in src/app/(site)/page.tsx.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="container-editorial py-16">
      <div className="max-w-lg">
        <span className="gold-rule block mb-5" />
        <h1 className="font-display text-4xl text-primary-deep">Shop by Category</h1>
      </div>

      {categories.length === 0 ? (
        <p className="mt-12 text-sm text-muted">Categories are coming soon.</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {categories.map((c) => (
            <CategoryCard
              key={c.slug}
              name={c.name}
              description={c.description ?? ""}
              href={c.href}
              imageUrl={c.imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
