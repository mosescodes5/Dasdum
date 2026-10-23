import type { Metadata } from "next";
import { getCategories } from "@/lib/db/catalog";
import { CategoryCard } from "@/components/categories/CategoryCard";

import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
export const metadata: Metadata = {
  title: "Categories",
  description: "Browse the DASDUM collection by category.",
};

// Categories are admin-managed rows in MySQL — see the note in src/app/(site)/page.tsx.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <PageHeader eyebrow="The collection" title="Shop by Category" />
      <div className="container-editorial py-12">
        {categories.length === 0 ? (
          <p className="text-sm text-muted">Categories are coming soon.</p>
        ) : (
          <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {categories.map((c) => (
              <StaggerItem key={c.slug}>
                <CategoryCard name={c.name} description={c.description ?? ""} href={c.href} imageUrl={c.imageUrl} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
