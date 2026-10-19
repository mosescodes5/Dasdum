import { create } from 'zustand';
import { ApiError, api } from '@/lib/api';
import type { Loc } from './world';

export interface Job { title: string; startHour: number; endHour: number; shiftMinutes: number; shiftsPerDay: number; shiftsToday: number; canQuitAt: number; shift: { startedAt: number; endsAt: number } | null }
export interface Me {
  now: number; job: Job | null; xp: number; xpFrom: number; xpTo: number;
  socialClass: string; homeName: string; home: Record<string, number>; inventory: { key: string; name: string; qty: number }[];
  name: string; age: number; level: number; occupation: string; jobTitle?: string; monthlySalaryKobo?: string; shiftsWorked?: number;
  cashKobo: string; bankKobo: string; accountNumber: string; reputation: number;
  needs: { energy: number; hunger: number; health: number; happiness: number; stress: number };
  skills: Record<string, number>;
  transactions: { id: string; amountKobo: string; balanceAfterKobo: string; description: string }[];
}
export interface ChatMsg { id: string; name: string; text: string; t: number }
/** A friend you invited home. Local to your screen (other players don't see them yet). */
export interface Guest { key: number; x: number; z: number; yaw: number; chair: boolean; leaving: boolean }
export type Quality = 'low' | 'medium' | 'high';
export type AppKey = 'bank' | 'jobs' | 'chat' | 'market' | 'bag' | 'contacts' | 'map' | 'calendar' | 'settings';
/** What each graphics level costs. 'low' is for older phones and battery saver. */
export const QUALITY: Record<Quality, { dpr: number; shadows: boolean; shadowMap: number; roomShadow: boolean; npcs: number; aa: boolean }> = {
  low: { dpr: 1, shadows: false, shadowMap: 512, roomShadow: false, npcs: 3, aa: false },
  medium: { dpr: 1.25, shadows: true, shadowMap: 1024, roomShadow: false, npcs: 6, aa: false },
  high: { dpr: 1.75, shadows: true, shadowMap: 2048, roomShadow: true, npcs: 12, aa: true },
};
const QKEY = 'nl_quality';

interface G {
  me: Me | null; loc: Loc; toast: string; phone: boolean; app: AppKey | null; menu: string | null; guest: Guest | null; cool: Record<string, number>;
  quality: Quality; error: number | null;
  chat: ChatMsg[]; peers: string[]; skew: number; net: 'connecting' | 'online' | 'offline';
  addChat: (m: ChatMsg) => void; setPeers: (p: string[]) => void; setNet: (n: 'connecting' | 'online' | 'offline') => void;
  refresh: () => Promise<void>; setLoc: (l: Loc) => void; say: (m: string) => void;
  togglePhone: () => void; openApp: (a: AppKey | null) => void; openMenu: (id: string | null) => void; setGuest: (g: Guest | null) => void;
  markCool: (action: string, ms: number) => void; setQuality: (q: Quality) => void; initPrefs: () => void;
}
let timer: ReturnType<typeof setTimeout> | undefined;
export const useGame = create<G>((set) => ({
  me: null, loc: 'outside', toast: '', phone: false, app: null, menu: null, guest: null, cool: {}, quality: 'medium', error: null, chat: [], peers: [], skew: 0, net: 'connecting',
  addChat: (m) => set((s) => ({ chat: [...s.chat.slice(-29), { ...m, t: Date.now() }] })), // stamped with OUR clock so fading never depends on the server's
  setPeers: (peers) => set({ peers }),
  setNet: (net) => set({ net }),
  refresh: async () => { try { const me = await api<Me>('/me'); set({ me, skew: me.now - Date.now() }); } catch (e) { if (e instanceof ApiError) set({ error: e.status }); } },
  setLoc: (loc) => set({ loc, menu: null, guest: null }),
  say: (toast) => { set({ toast }); clearTimeout(timer); timer = setTimeout(() => set({ toast: '' }), 4000); },
  togglePhone: () => set((s) => ({ phone: !s.phone, app: null, menu: null })),
  openApp: (app) => set({ app, phone: true, menu: null }),
  openMenu: (menu) => set(menu ? { menu, phone: false } : { menu }),
  setGuest: (guest) => set({ guest }),
  markCool: (action, ms) => set((s) => ({ cool: { ...s.cool, [action]: Date.now() + ms } })),
  setQuality: (quality) => { try { localStorage.setItem(QKEY, quality); } catch { /* private mode: just don't remember */ } set({ quality }); },
  initPrefs: () => { // saved choice wins; otherwise phones start on 'medium' and computers on 'high'
    let q: Quality | null = null; try { q = localStorage.getItem(QKEY) as Quality | null; } catch { /* ignore */ }
    if (q !== 'low' && q !== 'medium' && q !== 'high') q = matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
    set({ quality: q });
  },
}));
