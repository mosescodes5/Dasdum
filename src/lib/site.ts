// Contact details and social links, read from .env instead of being typed
// into page copy. Each one is optional: when it isn't set, the page simply
// leaves that line out rather than showing a made-up address or a link to
// the generic instagram.com homepage.
//
// NEXT_PUBLIC_* values are inlined at build time, so change them in .env
// and rebuild (same rule as the money settings in .env.example).

function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export const SITE = {
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  supportHours: clean(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
  social: [
    { label: "Instagram", url: clean(process.env.NEXT_PUBLIC_INSTAGRAM_URL) },
    { label: "Twitter", url: clean(process.env.NEXT_PUBLIC_TWITTER_URL) },
    { label: "Pinterest", url: clean(process.env.NEXT_PUBLIC_PINTEREST_URL) },
  ].filter((s): s is { label: string; url: string } => s.url !== null),
};
