import Link from "next/link";
import type { SiteContent } from "@/lib/site-content";

export function BrandStory({
  imageUrl,
  content,
}: {
  imageUrl?: string | null;
  content: SiteContent["brandStory"];
}) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      <div className="relative aspect-[4/3] md:aspect-auto bg-primary-deep order-2 md:order-1">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="order-1 md:order-2 flex items-center bg-white">
        <div className="max-w-md mx-auto px-6 py-16 md:py-0">
          <span className="gold-rule block mb-5" />
          <h2 className="font-display text-3xl md:text-4xl text-primary-deep">
            {content.heading}
          </h2>
          {content.paragraphs.map((text, i) => (
            <p key={i} className={`${i === 0 ? "mt-5" : "mt-4"} text-muted leading-relaxed`}>
              {text}
            </p>
          ))}
          <Link
            href="/about"
            className="mt-6 inline-block text-sm text-primary-deep link-underline hover:text-primary"
          >
            {content.linkLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
