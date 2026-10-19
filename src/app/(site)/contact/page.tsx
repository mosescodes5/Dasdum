import type { Metadata } from "next";
import { ContactForm } from "@/components/shared/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the DASDUM team.",
};

export default function ContactPage() {
  return (
    <div className="container-editorial py-16">
      <div className="max-w-2xl">
        <span className="gold-rule block mb-5" />
        <h1 className="font-display text-4xl text-primary-deep">Get in touch</h1>
        <p className="mt-3 text-muted">
          Questions about an order, a product, or wholesale? Send us a message and we&rsquo;ll reply within 1–2 business days.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">
        <ContactForm />

        <aside className="space-y-6 text-sm">
          {SITE.contactEmail && (
            <div>
              <h2 className="font-medium text-primary-deep">Email</h2>
              <p className="mt-1 text-muted">
                <a href={`mailto:${SITE.contactEmail}`} className="hover:text-primary-deep">{SITE.contactEmail}</a>
              </p>
            </div>
          )}
          {SITE.supportHours && (
            <div>
              <h2 className="font-medium text-primary-deep">Customer support</h2>
              <p className="mt-1 text-muted">{SITE.supportHours}</p>
            </div>
          )}
          {SITE.social.length > 0 && (
            <div>
              <h2 className="font-medium text-primary-deep">Follow along</h2>
              <div className="mt-1 flex gap-3 text-muted">
                {SITE.social.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary-deep">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
