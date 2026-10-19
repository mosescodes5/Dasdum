'use client';
import { useEffect, useState } from 'react';
import { ACTIONS, effectsFor } from '../../../../packages/game-core/src/actions';
import { CATALOG } from '../../../../packages/game-core/src/home';
import type { Opt } from '../../../../packages/game-core/src/world';
import { blockedReason, choose, optionsOf } from '@/game/controller';
import { useGame } from '@/game/store';
import { INTERACTABLES } from '@/game/world';
import { naira } from '@/lib/api';

const ICON: Record<string, string> = { energy: '⚡', hunger: '🍲', happiness: '😊', stress: '😰', health: '❤️' };
function chips(o: Opt, home: Record<string, number>) {
  if (!o.action || o.action === 'work') return [];
  return Object.entries(effectsFor(o.action, home)).filter(([, v]) => v).map(([k, v]) => ({ k, v: v as number, good: k === 'stress' ? (v as number) < 0 : (v as number) > 0 }));
}
/** Appears only after you tap an object, and goes away when you choose, close it, or tap the floor. */
export default function ActionMenu() {
  const id = useGame((s) => s.menu), me = useGame((s) => s.me), close = useGame((s) => s.openMenu), cool = useGame((s) => s.cool), [, tick] = useState(0);
  useEffect(() => { if (!id) return; const a = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(a); }, [id]);
  void cool; // re-render when a cooldown starts
  const it = id ? INTERACTABLES.find((i) => i.id === id) : null;
  if (!it || !me) return null;
  const tier = it.slot ? me.home?.[it.slot] ?? 0 : 0, title = it.slot ? CATALOG[it.slot][tier].name : it.label, opts = optionsOf(it);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <div className="hud sheet pointer-events-auto w-full max-w-sm !rounded-3xl p-3" role="dialog" aria-label={title}>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div><div className="text-base font-bold">{title}</div><div className="text-xs text-cream/60">What would you like to do?</div></div>
          <button aria-label="Close" onClick={() => close(null)} className="tap grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg active:scale-90">✕</button>
        </div>
        <div className="space-y-2">
          {opts.length === 0 && <div className="rounded-2xl bg-white/5 p-3 text-sm text-cream/70">Nothing to do here yet.</div>}
          {opts.map((o) => {
            const why = blockedReason(o), cost = o.action && o.action !== 'work' ? ACTIONS[o.action].costNaira : 0, fx = chips(o, me.home ?? {});
            return (
              <button key={o.id} disabled={!!why} onClick={() => choose(it, o)} className="tap flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 text-left transition active:scale-[0.98] disabled:opacity-45">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/30 text-xl">{o.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">{o.label}</span>
                  {fx.length > 0 && <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]">{fx.map((c) => <span key={c.k} className={c.good ? 'text-green-300' : 'text-red-300'}>{ICON[c.k]} {c.v > 0 ? '+' : '−'}{Math.abs(c.v)}</span>)}</span>}
                </span>
                <span className="shrink-0 text-right text-xs">{why ? <span className="text-amber-300">{why}</span> : cost > 0 ? <b className="text-gold">{naira(BigInt(cost) * 100n)}</b> : <span className="text-cream/50">Free</span>}</span>
              </button>);
          })}
        </div>
      </div>
    </div>);
}
