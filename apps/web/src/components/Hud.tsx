'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { lagosDate } from '../../../../packages/game-core/src/clock';
import ActionMenu from '@/components/ActionMenu';
import Phone from '@/components/Phone';
import { Money, StatBar } from '@/components/ui';
import { endShift, rt } from '@/game/controller';
import { districtAt, streetAt } from '@/game/world';
import { api, friendly, naira } from '@/lib/api';
import { useGame } from '@/game/store';

const PLACE = { outside: 'Mainland District', home: 'Home', office: 'Workplace' } as const;

const DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Its own component, so the clock ticking never re-renders the rest of the HUD. The game runs on real Lagos time. */
function Clock() {
  const loc = useGame((s) => s.loc), [now, setNow] = useState(0);
  useEffect(() => { const f = () => setNow(Date.now()); f(); const a = setInterval(f, 1000); return () => clearInterval(a); }, []);
  const d = lagosDate(now || Date.now()), h = d.getUTCHours(), mi = d.getUTCMinutes();
  const where = loc === 'outside' ? `${streetAt(rt.x, rt.z) ?? 'Side street'}, ${districtAt(rt.x, rt.z)}` : PLACE[loc];
  return <div className="text-xs text-cream/80"><div>{h >= 6 && h < 18 ? '☀️' : '🌙'} {DAY3[d.getUTCDay()]} {d.getUTCDate()} {MON3[d.getUTCMonth()]} · {String(h).padStart(2, '0')}:{String(mi).padStart(2, '0')}</div><div>📍 {where}</div></div>;
}
/** Countdown while you're on a shift. Stay inside the workplace until it reaches zero or the shift is unpaid. */
function ShiftBar() {
  const shift = useGame((s) => s.me?.job?.shift), skew = useGame((s) => s.skew), [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!shift) return; const a = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(a); }, [shift]);
  if (!shift) return null;
  const total = shift.endsAt - shift.startedAt, left = Math.max(0, shift.endsAt - (now + skew)), sec = Math.ceil(left / 1000);
  return (<div className="rounded-lg bg-black/25 px-2 py-1.5 text-xs"><div className="flex items-center justify-between"><span>💼 On shift</span><b>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</b><button onClick={() => void endShift()} className="tap rounded-md bg-white/10 px-2 py-0.5 text-[10px] active:scale-95">End</button></div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gold transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (100 * (total - left)) / total)}%` }} /></div></div>);
}
/** Collects your pay the moment a shift's 20 minutes are up. */
function ShiftRunner() {
  const end = useGame((s) => s.me?.job?.shift?.endsAt), busy = useRef(false);
  useEffect(() => {
    if (!end) return;
    const a = setInterval(async () => {
      const st = useGame.getState();
      if (busy.current || Date.now() + st.skew < end) return;
      busy.current = true;
      try { const r = await api<{ netKobo: string; promotedTo: string | null; levelUp: number | null }>('/jobs/shift/finish', { body: {} }); st.say(`Shift complete: +${naira(r.netKobo)} after tax` + (r.levelUp ? ` · Level ${r.levelUp}! ⭐` : '') + (r.promotedTo ? ` · Promoted to ${r.promotedTo}! 🎉` : '')); await st.refresh(); }
      catch (e) { const m = friendly(e); if (!/not over yet/.test(m)) { st.say(m); await st.refresh(); } } // "not over yet" = our clock ran slightly ahead; just try again
      finally { busy.current = false; }
    }, 1000);
    return () => clearInterval(a);
  }, [end]);
  return null;
}
function Status() {
  const me = useGame((s) => s.me);
  if (!me) return null;
  return (
    <div className="hud fixed left-2 top-2 z-10 w-52 space-y-2 !rounded-2xl p-3 md:left-3 md:top-3 md:w-64 md:p-4">
      <div><div className="text-sm font-bold">{me.name}</div><div className="text-xs text-cream/70">{me.job?.title ?? 'Unemployed'} · Lv {me.level} · {me.socialClass}</div></div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-black/25 px-2 py-1"><div className="text-[10px] opacity-60">BANK</div><b><Money kobo={me.bankKobo} /></b></div>
        <div className="rounded-lg bg-black/25 px-2 py-1"><div className="text-[10px] opacity-60">CASH</div><b><Money kobo={me.cashKobo} /></b></div>
      </div>
      <Clock />
      <ShiftBar />
      <div className="space-y-1"><StatBar icon="🍲" label="Hunger" v={me.needs.hunger} /><StatBar icon="⚡" label="Energy" v={me.needs.energy} /><StatBar icon="😊" label="Mood" v={me.needs.happiness} /><StatBar icon="😰" label="Stress" v={100 - me.needs.stress} /></div>
      <div className="hidden text-[10px] text-cream/50 md:block">Tap an object to use it · tap the floor to walk · WASD move · drag orbit · scroll zoom · P phone · Enter chat</div>
    </div>);
}
/** New chat lines appear for a few seconds and fade. To type, open the Chat app on your phone (or press Enter). */
function ChatFeed() {
  const chat = useGame((s) => s.chat), [now, setNow] = useState(() => Date.now());
  useEffect(() => { const a = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(a); }, []);
  const fresh = chat.filter((m) => now - m.t < 8000).slice(-3);
  if (!fresh.length) return null;
  return (<div className="pointer-events-none fixed bottom-20 left-2 z-10 w-56 space-y-1 md:left-3 md:w-80">
    {fresh.map((m) => <div key={m.t + m.id} className="rounded-lg bg-black/70 px-3 py-1 text-sm"><b className="text-gold">{m.name.split(' ')[0]}</b> {m.text}</div>)}</div>);
}
function Toast() {
  const toast = useGame((s) => s.toast);
  return <AnimatePresence>{toast && <motion.div key={toast} className="pointer-events-none fixed left-1/2 top-4 z-20 max-w-[90vw] rounded-2xl bg-gradient-to-r from-naija to-naija-light px-5 py-2.5 text-center font-medium shadow-xl" initial={{ y: -40, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: -30, opacity: 0, x: '-50%' }}>{toast}</motion.div>}</AnimatePresence>;
}
function Fade() { const loc = useGame((s) => s.loc); return <motion.div key={loc} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="pointer-events-none fixed inset-0 z-40 bg-black" />; }

export default function Hud() {
  const hasMe = useGame((s) => !!s.me), refresh = useGame((s) => s.refresh), togglePhone = useGame((s) => s.togglePhone);
  useEffect(() => { const b = setInterval(() => { if (!document.hidden) void refresh(); }, 15_000); return () => clearInterval(b); }, [refresh]);
  if (!hasMe) return null;
  return (<>
    <Fade /><Status /><ShiftRunner /><ChatFeed /><Toast /><ActionMenu /><Phone />
    <button aria-label="Phone" className="tap fixed bottom-4 right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-naija-light to-naija text-2xl shadow-xl transition-transform active:scale-90" onClick={togglePhone}>📱</button>
  </>);
}
