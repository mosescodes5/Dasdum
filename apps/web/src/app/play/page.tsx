'use client';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Backdrop from '@/components/Backdrop';
import Hud from '@/components/Hud';
import { useGame } from '@/game/store';

const GameCanvas = dynamic(() => import('@/game/GameCanvas'), { ssr: false });
export default function Play() {
  const router = useRouter();
  const me = useGame((s) => s.me), error = useGame((s) => s.error), refresh = useGame((s) => s.refresh), initPrefs = useGame((s) => s.initPrefs);
  useEffect(() => { initPrefs(); void refresh(); }, [refresh, initPrefs]);
  useEffect(() => { if (error) router.replace(error === 409 ? '/survey' : '/'); }, [error, router]);
  if (!me) return (<main className="relative grid min-h-screen place-items-center"><Backdrop />
    <div className="glass flex flex-col items-center gap-3 p-10"><motion.div className="h-12 w-12 rounded-full border-4 border-gold border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} /><p>Loading your life…</p></div></main>);
  return (<><GameCanvas /><Hud /></>);
}
