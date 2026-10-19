'use client';
import { AnimatePresence, animate, motion, useMotionValue, type HTMLMotionProps } from 'framer-motion';
import { useEffect, useState } from 'react';

const spring = { type: 'spring', stiffness: 400, damping: 20 } as const;
export const Btn = ({ className = '', ...p }: HTMLMotionProps<'button'>) => <motion.button whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={spring} className={`btn ${className}`} {...p} />;
export const GhostBtn = ({ className = '', ...p }: HTMLMotionProps<'button'>) => <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={spring} className={`btn-ghost ${className}`} {...p} />;

export function StatBar({ icon, label, v }: { icon: string; label: string; v: number }) {
  const c = v < 25 ? '#ef4444' : v < 50 ? '#f59e0b' : '#22c55e';
  return ( // plain CSS transition: cheap, unlike a spring per bar on every update
    <div className="flex items-center gap-2 text-xs"><span className="w-5 text-center">{icon}</span><span className="w-12 opacity-80">{label}</span>
      <div className="h-2 w-24 rounded-full bg-black/40 overflow-hidden"><div className="h-full rounded-full transition-[width,background-color] duration-700 ease-out" style={{ width: `${Math.max(2, v)}%`, backgroundColor: c }} /></div></div>);
}
/** Counts smoothly up/down to the new naira value. */
export function Money({ kobo }: { kobo?: string | null }) {
  const mv = useMotionValue(0); const [t, setT] = useState('₦0');
  useEffect(() => {
    const to = Number(BigInt(kobo ?? '0') / 100n);
    const c = animate(mv, to, { duration: 0.9, ease: 'easeOut' }); const u = mv.on('change', (v) => setT('₦' + Math.round(v).toLocaleString('en-NG')));
    return () => { c.stop(); u(); };
  }, [kobo, mv]);
  return <span>{t}</span>;
}

const Eye = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
const EyeOff = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.5 10.5 0 0 0 4.1-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>);
/** Password box with a show/hide eye. */
export function PasswordInput({ value, onChange, placeholder = 'Password', autoComplete, onBlur }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; onBlur?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className="input pr-14" type={show ? 'text' : 'password'} value={value} placeholder={placeholder} autoComplete={autoComplete} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
      <button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)} className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-cream/70 transition hover:text-gold">
        <AnimatePresence mode="wait" initial={false}><motion.span key={show ? 'off' : 'on'} initial={{ scale: 0.6, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.15 }}>{show ? <EyeOff /> : <Eye />}</motion.span></AnimatePresence>
      </button>
    </div>);
}
/** Label + input slot + animated error line. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (<label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-cream/70">{label}</span>{children}
    <AnimatePresence initial={false}>{error ? <motion.span key="e" className="block text-xs text-red-300" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{error}</motion.span> : hint ? <span key="h" className="block text-xs text-cream/50">{hint}</span> : null}</AnimatePresence></label>);
}
