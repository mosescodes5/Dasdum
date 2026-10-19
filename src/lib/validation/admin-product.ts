import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  shortDescription: z.string().max(200).optional(),
  description: z.string().optional(),
  price: z.coerce.number().int().min(0, "Price can't be negative"),
  salePrice: z.coerce.number().int().min(0).optional().nullable(),
  sku: z.string().min(1, "SKU is required"),
  stock: z.coerce.number().int().min(0),
  categoryId: z.string().min(1, "Choose a category"),
  tags: z.string().optional(), // comma-separated in the form, stored as JSON
  featuredImageMediaId: z.string().optional().nullable(),
  // Extra photos beyond the featured image, shown on the product detail
  // page's gallery, in the order given.
  galleryMediaIds: z.array(z.string()).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(["draft", "published", "archived"]),
});

export type ProductFormValues = z.infer<typeof productSchema>;
