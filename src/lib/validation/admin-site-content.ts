import { z } from "zod";

const short = (max: number) => z.string().trim().min(1, "Required").max(max);

export const siteContentSchema = z.object({
  brandStory: z.object({
    heading: short(160),
    tagline: short(80),
    paragraphs: z.array(short(1200)).min(1).max(4),
    linkLabel: short(40),
  }),
  whyDasdum: z.object({
    heading: short(80),
    pillars: z.array(z.object({ title: short(60), body: short(240) })).length(5),
  }),
  about: z.object({
    heading: short(80),
    intro: short(600),
    sections: z.array(z.object({ title: short(80), body: short(1500) })).min(1).max(8),
  }),
});

export type SiteContentValues = z.infer<typeof siteContentSchema>;
