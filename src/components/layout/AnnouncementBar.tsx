import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { freeShippingThreshold } from "@/lib/shipping";

// Top promo bar from the design. The free-shipping figure comes from
// NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, so it can never disagree with checkout.
export function AnnouncementBar({ message }: { message?: string }) {
  const threshold = freeShippingThreshold();

  return (
    <div className="bg-primary-deep text-white">
      <div className="container-editorial flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2.5">
        {message ? (
          <p className="text-sm font-medium">{message}</p>
        ) : threshold ? (
          <p className="text-[1.05rem] font-black uppercase tracking-[0.02em]">
            Free shipping on orders <span className="text-gold">over {formatMoney(threshold)}</span>
          </p>
        ) : (
          <p className="text-[1.05rem] font-black uppercase tracking-[0.02em]">
            Designed with purpose. <span className="text-gold">Made for today.</span>
          </p>
        )}
        <Link href="/shop" className="btn btn-tan !py-1.5 !px-4">
          Shop now <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
