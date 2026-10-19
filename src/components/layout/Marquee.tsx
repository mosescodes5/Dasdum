import { Asterisk } from "lucide-react";

/** Endless ticker under the hero. Fed with the "Why" pillar titles (admin-
 * editable), so it never shows wording that isn't in Site Content. The list
 * is rendered twice and slid by -50% for a seamless loop. */
export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const row = (suffix: string) =>
    items.map((t, i) => (
      <span key={`${suffix}${i}`} className="flex shrink-0 items-center gap-8 pr-8">
        <span className="text-sm font-black uppercase tracking-[0.12em]">{t}</span>
        <Asterisk size={18} className="text-gold" aria-hidden="true" />
      </span>
    ));
  return (
    <div className="overflow-hidden bg-primary-deep py-3.5 text-white" aria-hidden="true">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row("a")}
        {row("b")}
        {row("c")}
        {row("d")}
      </div>
    </div>
  );
}
