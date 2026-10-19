import type { Metadata } from "next";
import { ContactReference } from "@/components/shared/ContactReference";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-editorial py-16 max-w-2xl">
      <span className="gold-rule block mb-5" />
      <h1 className="font-display text-4xl text-primary-deep">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted">Last updated: September 2026</p>

      <div className="mt-10 space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="font-medium text-text text-base mb-2">1. Who we are</h2>
          <p>
            DASDUM (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates dasdum.co.uk. This
            policy explains what information we collect when you use the
            site, why we collect it, and the choices you have.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">2. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account information:</strong> name, email address, and password (stored as a securely hashed value, never in plain text) when you register.</li>
            <li><strong>Order and shipping information:</strong> billing and delivery addresses, phone number, and order history.</li>
            <li><strong>Payment information:</strong> payments are processed by Stripe. We do not receive or store your full card details — only a payment reference and status.</li>
            <li><strong>Cart and wishlist:</strong> saved locally in your browser so your selections persist between visits, even before you create an account.</li>
            <li><strong>Communications:</strong> anything you send us via the contact form.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">3. How we use it</h2>
          <p>
            To process and fulfil orders, manage your account, respond to
            enquiries, and — only if you&rsquo;ve opted in — send you
            occasional updates about new products or offers. We do not sell
            your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">4. Who we share it with</h2>
          <p>
            We share the minimum necessary information with service
            providers who help us run the store: Stripe (payment
            processing), our hosting provider, and, if you contact us, our
            email service. Each only receives what they need to perform
            their function.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">5. Cookies and local storage</h2>
          <p>
            We use your browser&rsquo;s local storage to remember your cart
            and wishlist, and a session cookie to keep you signed in. These
            are functional, not tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">6. Your rights</h2>
          <p>
            You can access, correct, or delete your account information at
            any time from your account settings, or by contacting us
            (<ContactReference />). You can also ask us what personal data we hold
            about you.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">7. Data retention</h2>
          <p>
            We keep order records for as long as needed for accounting,
            warranty, and legal purposes. If you delete your account, we
            remove your personal profile data but may retain anonymised
            order records.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">8. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes
            will be reflected by updating the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text text-base mb-2">9. Contact</h2>
          <p>Questions about this policy? <ContactReference />.</p>
        </section>
      </div>
    </div>
  );
}
