import { z } from "zod";

export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  excerpt: z.string().max(240).optional(),
  content: z.string().min(1, "Content is required"),
  coverMediaId: z.string().optional().nullable(),
  categoryName: z.string().optional(), // free-text; upserted into blog_category server-side
  tags: z.string().optional(), // comma-separated, stored as JSON
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(["draft", "published"]),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;
