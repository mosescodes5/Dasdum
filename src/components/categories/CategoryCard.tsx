import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type CategoryCardProps = {
  name: string;
  description: string;
  href: string;
  imageUrl?: string | null; // set at /admin/settings (developer-only) — plain color until then
};

/** Large category card, used on the /shop/categories page. */
export function CategoryCard({ name, description, href, imageUrl }: CategoryCardProps) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-primary">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[700ms] ease-editorial group-hover:scale-[1.08]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/80 via-transparent to-transparent transition-opacity duration-300 group-hover:from-primary-deep/90" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h3 className="text-2xl">{name}</h3>
          {description && <p className="mt-1 max-w-xs text-sm text-white/80">{description}</p>}
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold-light">
            Explore
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
