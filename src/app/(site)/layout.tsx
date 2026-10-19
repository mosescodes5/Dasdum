import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteNav } from "@/components/navigation/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CartProvider } from "@/components/cart/CartContext";
import { WishlistProvider } from "@/components/cart/WishlistContext";
import { MotionProvider } from "@/components/motion/MotionProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <CartProvider>
        <WishlistProvider>
          {/* .storefront scopes the heavy-uppercase heading style to the shop, not the admin */}
          <div className="storefront">
            <AnnouncementBar />
            <SiteNav />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </WishlistProvider>
      </CartProvider>
    </MotionProvider>
  );
}
