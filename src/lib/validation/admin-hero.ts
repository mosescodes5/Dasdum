import { z } from "zod";

export const heroContentSchema = z.object({
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(1, "Required").max(120),
  subheading: z.string().min(1, "Required").max(300),
  primaryCta: z.object({
    label: z.string().min(1, "Required").max(40),
    href: z.string().min(1, "Required").max(200),
  }),
  secondaryCta: z.object({
    label: z.string().min(1, "Required").max(40),
    href: z.string().min(1, "Required").max(200),
  }),
  imageUrl: z.string().url().nullable(),
});

export type HeroContentValues = z.infer<typeof heroContentSchema>;
