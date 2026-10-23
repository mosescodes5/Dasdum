import type { Metadata } from "next";
import { SITE } from "@/lib/site";

import { PageHeader } from "@/components/shared/PageHeader";
export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about shipping, returns, and orders at DASDUM.",
};

const FAQS: { id: string; question: string; answer: string }[] = [
  {
    id: "shipping",
    question: "How long does shipping take?",
    answer:
      "Orders are dispatched within 2–3 business days. Standard delivery within the UK typically takes 3–7 business days; international shipping takes 7–14 business days. You'll receive a tracking link by email once your order ships.",
  },
  {
    id: "returns",
    question: "What's your returns policy?",
    answer:
      `Unused items in their original packaging can be returned within 14 days of delivery for a full refund, minus original shipping costs. To start a return, contact us ${SITE.contactEmail ? `at ${SITE.contactEmail}` : "through the contact page"} with your order number.`,
  },
  {
    id: "sizing",
    question: "How do I know what size to order?",
    answer:
      "If you're unsure about size or fit, get in touch through the contact page before ordering and we're happy to advise.",
  },
  {
    id: "tracking",
    question: "How do I track my order?",
    answer:
      "Once your order ships, you'll get a tracking link by email. You can also check order status any time from your account under Orders.",
  },
  {
    id: "payment",
    question: "What payment methods do you accept?",
    answer:
      "We accept major debit and credit cards, processed securely through Stripe. We never see or store your full card details.",
  },
  {
    id: "international",
    question: "Do you ship internationally?",
    answer:
      "Yes — we ship worldwide. International orders may be subject to customs duties or import taxes charged by your country, which are the responsibility of the recipient.",
  },
  {
    id: "wholesale",
    question: "Do you offer wholesale or stockist opportunities?",
    answer:
      "We do. Get in touch through the contact page with a bit about your business and we'll follow up with details.",
  },
];

export default function FaqPage() {
  return (
    <>
    <PageHeader eyebrow="Help" title="Frequently Asked Questions" width="2xl" />
    <div className="container-editorial py-12 max-w-2xl">
      <div className="anim-rise divide-y divide-hairline border-t border-b border-hairline">
        {FAQS.map((faq) => (
          <details key={faq.id} id={faq.id} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-primary-deep transition-colors hover:text-gold-text">
              {faq.question}
              <span className="ml-4 shrink-0 text-gold transition-transform duration-300 group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <p className="anim-rise mt-3 text-sm text-muted leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Can&rsquo;t find what you&rsquo;re looking for?{" "}
        <a href="/contact" className="text-primary-deep link-underline">
          Get in touch
        </a>
        .
      </p>
    </div>
    </>
  );
}
