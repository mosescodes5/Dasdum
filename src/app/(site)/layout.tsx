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
          {/* .storefront marks the public shop (as opposed to the admin) for styling */}
          <div id="top" className="storefront">
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
