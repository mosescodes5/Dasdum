import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { cached, clearCache } from "@/lib/cache";
import { siteSetting } from "@/lib/db/schema";

// Admin-editable page copy: the homepage "Rooted in craft" section, the
// "Why DASDUM" pillars and the About page. Stored as one JSON row in
// `site_setting` (no new table). The defaults below are the wording the
// site shipped with, so nothing is blank until someone edits it — they
// live here, in one place, instead of being scattered through components.

export type SiteContent = {
  brandStory: { heading: string; tagline: string; paragraphs: string[]; linkLabel: string };
  whyDasdum: { heading: string; pillars: { title: string; body: string }[] }; // always 5, one per icon
  about: { heading: string; intro: string; sections: { title: string; body: string }[] };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brandStory: {
    heading: "Rooted in craft. Built for how people actually live.",
    tagline: "Quality first, trend second.",
    paragraphs: [
      "DASDUM brings thoughtful design and quality-first essentials into everyday life. Every product is selected with care, balancing lasting value, practical use, and a distinct sense of style.",
    ],
    linkLabel: "Read Our Story",
  },
  whyDasdum: {
    heading: "Why DASDUM",
    pillars: [
      { title: "Thoughtful Design", body: "Every product starts as a problem worth solving, not a trend to chase." },
      { title: "Quality First", body: "Materials and construction chosen to last years, not one season." },
      { title: "Modern Heritage", body: "Craft traditions reinterpreted for how people live today." },
      { title: "Responsible Craft", body: "Smaller runs, better sourcing, less waste at every stage." },
      { title: "Made for You", body: "Designed around real routines, not a showroom." },
    ],
  },
  about: {
    heading: "About DASDUM",
    intro:
      "DASDUM makes thoughtful, quality-first goods for everyday living — homeware, bags, and apparel designed with modern African expression at their core, built to last rather than to trend.",
    sections: [
      {
        title: "Our story",
        body: "DASDUM started with a simple frustration: too many everyday goods looked either disposable or borrowed from somewhere else. We work with makers and small studios to design pieces that hold their own anywhere — on a shelf in Lagos or a table in London — without performing an idea of “African design” for anyone.",
      },
      {
        title: "Our mission",
        body: "To build a genuinely international, modern brand rooted in craft traditions — proving that thoughtful design and quality construction don’t have to come from any one place, and that heritage can look forward as easily as it looks back.",
      },
      {
        title: "Our philosophy",
        body: "Quality first, trend second. Every material is chosen for how it ages, not just how it photographs. We’d rather make fewer things well than fill a catalog — which is why our collections stay small and every piece gets real attention before it ships.",
      },
    ],
  },
};

const KEY = "site_content";

/** Saved copy merged over the defaults. Falls back to the defaults on a
 * missing row or malformed JSON, and keeps the pillar count at exactly 5
 * so every icon always has a card. */
export const getSiteContent = (): Promise<SiteContent> => cached("site-content", loadSiteContent);

async function loadSiteContent(): Promise<SiteContent> {
  const db = await getDb();
  const row = (await db.select().from(siteSetting).where(eq(siteSetting.key, KEY)))[0];
  if (!row) return DEFAULT_SITE_CONTENT;
  try {
    const saved = JSON.parse(row.value) as Partial<SiteContent>;
    const pillars = saved.whyDasdum?.pillars;
    return {
      brandStory: { ...DEFAULT_SITE_CONTENT.brandStory, ...saved.brandStory },
      whyDasdum: {
        heading: saved.whyDasdum?.heading ?? DEFAULT_SITE_CONTENT.whyDasdum.heading,
        pillars:
          pillars && pillars.length === DEFAULT_SITE_CONTENT.whyDasdum.pillars.length
            ? pillars
            : DEFAULT_SITE_CONTENT.whyDasdum.pillars,
      },
      about: { ...DEFAULT_SITE_CONTENT.about, ...saved.about },
    };
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export async function setSiteContent(content: SiteContent): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const value = JSON.stringify(content);
  await db
    .insert(siteSetting)
    .values({ key: KEY, value, updatedAt: now })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: now } });
  clearCache();
}
