import type { Metadata } from "next";
import { ContactReference } from "@/components/shared/ContactReference";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container-editorial py-16 max-w-2xl">
      <span className="gold-rule block mb-5" />
      <h1 className="font-display text-4xl text-primary-deep">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted">Last updated: September 2026</p>

      <div className="mt-10 space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="font-medium text-text text-base mb-2">1. Acceptance of terms</h2>
          <p>
            By using dasdum.co.uk or placing an order, you agree to these
            terms. If you don&rsquo;t agree, please don&rsquo;t use the site.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">2. Orders and pricing</h2>
          <p>
            All prices include applicable taxes unless stated otherwise. We
            reserve the right to correct pricing errors and to cancel orders
            placed at an incorrect price, in which case you&rsquo;ll be
            notified and fully refunded.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">3. Payment</h2>
          <p>
            Payment is processed securely by Stripe at checkout. Your
            order is confirmed once payment is successfully authorised.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">4. Shipping and returns</h2>
          <p>
            Shipping timeframes and our returns policy are set out on our{" "}
            <a href="/faq" className="text-primary-deep link-underline">FAQ page</a>. Unused items in
            original packaging can be returned within 14 days of delivery.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">5. Your account</h2>
          <p>
            You&rsquo;re responsible for keeping your account password
            confidential and for all activity under your account. Let us
            know immediately if you suspect unauthorised access.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">6. Intellectual property</h2>
          <p>
            All content on this site — including product photography, text,
            logos, and design — belongs to DASDUM or its licensors and may
            not be reproduced without permission.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">7. Limitation of liability</h2>
          <p>
            We aim for accuracy in everything we publish, but we don&rsquo;t
            guarantee the site will be error-free or uninterrupted. To the
            extent permitted by law, DASDUM isn&rsquo;t liable for indirect
            or consequential losses arising from your use of the site.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">8. Changes to these terms</h2>
          <p>
            We may update these terms from time to time; continued use of
            the site after changes means you accept the revised terms.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">9. Governing law</h2>
          <p>These terms are governed by the laws of England and Wales.</p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">10. Contact</h2>
          <p>Questions about these terms? <ContactReference />.</p>
        </section>
      </div>
    </div>
  );
}
