import { Lock } from "lucide-react";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Reveal } from "@/components/motion/Reveal";

export function Newsletter() {
  return (
    <section id="news" className="py-8 pb-12">
      <Reveal className="container-editorial">
        <div className="grid grid-cols-1 items-center gap-8 rounded-lg border border-hairline p-6 md:grid-cols-2 md:px-8">
          <div className="flex items-center gap-4">
            <Lock strokeWidth={1.2} className="h-11 w-11 shrink-0" />
            <div>
              <h3 className="mb-1 text-[0.85rem]">Secure checkout</h3>
              <p className="text-sm text-muted">Card payments are processed securely by Stripe.</p>
            </div>
          </div>
          <div>
            <h4 className="mb-1 text-[0.78rem]">Stay in the DASDUM circle</h4>
            <p className="text-sm text-muted">New arrivals, journal stories and early access to limited runs. No spam.</p>
            <NewsletterForm />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
