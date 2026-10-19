import type { ActionKey } from './actions';
import type { SlotKey } from './home';
import type { PostureName } from './postures';

export const LOCS = ['outside', 'home', 'office'] as const;
export type Loc = (typeof LOCS)[number];
export type V2 = [number, number];
export const ORIGIN: Record<Loc, number> = { outside: 0, home: 1000, office: 2000 }; // interiors live far apart on the X axis
export const BOUNDS: Record<Loc, { x0: number; x1: number; z0: number; z1: number }> = {
  outside: { x0: -115, x1: 115, z0: -115, z1: 115 }, home: { x0: 994.6, x1: 1005.4, z0: -5.4, z1: 5.6 }, office: { x0: 1994.6, x1: 2005.4, z0: -5.4, z1: 5.6 },
};

function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export interface Bldg { x: number; z: number; w: number; d: number; h: number; color: number; park?: boolean }
export const HOME_B: Bldg = { x: -40, z: 40, w: 22, d: 18, h: 9, color: 0x2e8b57 };
export const WORK_B: Bldg = { x: 40, z: -40, w: 22, d: 18, h: 9, color: 0x4a6fa5 };
const COLORS = [0xd9b88f, 0xc9794a, 0xe8d9b5, 0xb55a3c, 0xa7b8a0, 0xe0c070];
// Deterministic (seeded): every client builds the identical city, which multiplayer will rely on.
export const BUILDINGS: Bldg[] = (() => {
  const R = rng(7), out: Bldg[] = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if ((i === -1 && j === 1) || (i === 1 && j === -1)) continue;
    const x = i * 40, z = j * 40;
    if (R() < 0.2) { out.push({ x, z, w: 24, d: 24, h: 0, color: 0x3d7a2e, park: true }); continue; }
    out.push({ x, z, w: 14 + R() * 8, d: 14 + R() * 6, h: 5 + R() * 8, color: COLORS[Math.floor(R() * COLORS.length)] });
  }
  return out;
})();
const SOLIDS = [...BUILDINGS.filter((b) => !b.park), HOME_B, WORK_B];
export const blocked = (x: number, z: number) => SOLIDS.some((b) => Math.abs(x - b.x) < b.w / 2 + 0.6 && Math.abs(z - b.z) < b.d / 2 + 0.6);
/** Strict footprint test used by the server (no player margin, so rounding can't cause false alarms). */
export const insideSolid = (x: number, z: number) => SOLIDS.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);

/** One thing you can DO with an object. The object's menu lists these; the server decides the outcome of any `action`. */
export interface Opt {
  id: string; label: string; icon: string;
  action?: 'work' | ActionKey;                                      // asks the SERVER first (cost / cooldown / energy)
  req?: [SlotKey, number];                                           // option only offered once you own at least this tier (e.g. TV)
  seat?: { x: number; z: number; yaw: number }; stand?: V2;          // overrides the object's own seat
  steps?: { posture: PostureName; seconds: number }[]; stay?: PostureName; // postures played, then optionally held until the player stands
  doneMsg?: string;
  guest?: boolean;                                                   // a friend comes over and sits with you
  when?: 'onShift' | 'offShift';                                     // only offered while you are / are not on a shift
  special?: 'end-shift';                                             // handled locally, no walking or animation
}
export interface Interactable {
  id: string; loc: Loc; at: V2; label: string; radius?: number; kind: 'enter' | 'action';
  to?: { loc: Loc; x: number; z: number; yaw: number };          // kind 'enter' (doors act at once, no menu)
  slot?: SlotKey;                                                  // the title shows the name of the tier you own (e.g. "Small sofa")
  hit?: [number, number, number, number, number];                  // tap box: centre x, centre z, half-width, half-depth, height
  seat?: { x: number; z: number; yaw: number }; stand?: V2;        // where the body goes / returns to
  options?: Opt[];                                                 // what the menu offers
  req?: [SlotKey, number];                                         // object hidden until you own at least this tier
}
const P = Math.PI;
const SOFA = { x: 1002.2, z: 1, yaw: P / 2 };
export const INTERACTABLES: Interactable[] = [
  { id: 'door-home', loc: 'outside', at: [-40, 52], label: 'Front door', kind: 'enter', hit: [-40, 50.5, 2, 2.5, 3.6], to: { loc: 'home', x: 1000, z: 4.4, yaw: P } },
  { id: 'door-work', loc: 'outside', at: [40, -29.2], label: 'Office door', kind: 'enter', hit: [40, -30.2, 2, 2.3, 3.6], to: { loc: 'office', x: 2000, z: 4.4, yaw: P } },
  { id: 'market', loc: 'outside', at: [10, 24.6], label: 'Food stall', kind: 'action', hit: [10, 22, 2.6, 2.2, 3.5], seat: { x: 10, z: 24.6, yaw: P }, stand: [10, 25.6],
    options: [{ id: 'street_food', label: 'Buy street food', icon: '🍛', action: 'street_food', steps: [{ posture: 'eat', seconds: 4 }], doneMsg: 'Jollof and plantain. Tasty.' }] },
  { id: 'bench', loc: 'outside', at: [-28, 54.4], label: 'Bench', kind: 'action', hit: [-28, 53, 2, 1.1, 1.5], seat: { x: -28, z: 53, yaw: 0 }, stand: [-28, 54.8],
    options: [{ id: 'sit', label: 'Sit and rest', icon: '🪑', action: 'rest', steps: [{ posture: 'sit', seconds: 4 }], stay: 'sit', doneMsg: 'Nice to catch your breath.' }] },
  { id: 'exit-home', loc: 'home', at: [1000, 4.9], label: 'Door', kind: 'enter', hit: [1000, 5.2, 1, 0.6, 0.3], to: { loc: 'outside', x: -40, z: 53, yaw: 0 } },
  { id: 'bed', loc: 'home', at: [998.8, -3], label: 'Bed', kind: 'action', slot: 'bed', hit: [997.5, -4.4, 1.2, 1.3, 1.1], seat: { x: 997.5, z: -4.2, yaw: 0 }, stand: [998.8, -3],
    options: [
      { id: 'sleep', label: 'Sleep', icon: '😴', action: 'sleep', steps: [{ posture: 'sleep', seconds: 8 }], doneMsg: 'You slept well.' },
      { id: 'lie', label: 'Lie down and rest', icon: '🛏️', action: 'rest', steps: [{ posture: 'sleep', seconds: 4 }], doneMsg: 'Nice to stretch out.' },
    ] },
  { id: 'kitchen', loc: 'home', at: [1002, -3.9], label: 'Cooker', kind: 'action', slot: 'cooker', hit: [1002, -5.4, 1.5, 0.6, 1.3], seat: { x: 1002, z: -4.3, yaw: P }, stand: [1002, -3.2],
    options: [{ id: 'cook', label: 'Cook and eat', icon: '🍲', action: 'cook', steps: [{ posture: 'cook', seconds: 4 }, { posture: 'eat', seconds: 3 }], doneMsg: 'Rice and stew. Sweet.' }] },
  { id: 'fridge', loc: 'home', at: [1004.8, -3.6], label: 'Food storage', kind: 'action', slot: 'fridge', hit: [1004.8, -5.4, 0.6, 0.55, 2.1], seat: { x: 1004.8, z: -4.2, yaw: P }, stand: [1004.8, -3.6],
    options: [{ id: 'drink', label: 'Get a cold drink', icon: '🥤', action: 'drink', steps: [{ posture: 'eat', seconds: 2 }], doneMsg: 'Refreshing.' }] },
  { id: 'seat', loc: 'home', at: [1000.7, 1], label: 'Seat', kind: 'action', slot: 'seat', hit: [1002.2, 1, 0.95, 1.3, 1.2], seat: SOFA, stand: [1000.7, 1],
    options: [
      { id: 'sit', label: 'Sit and relax', icon: '🪑', action: 'rest', steps: [{ posture: 'sit', seconds: 4 }], stay: 'sit', doneMsg: 'Quiet moment.' },
      { id: 'tv', label: 'Watch TV', icon: '📺', action: 'tv', req: ['tv', 1], steps: [{ posture: 'sit_tv', seconds: 6 }], stay: 'sit_tv', doneMsg: 'Nollywood marathon.' },
      { id: 'nap', label: 'Take a nap here', icon: '💤', action: 'nap', steps: [{ posture: 'nap', seconds: 8 }], stay: 'sit', doneMsg: 'A short nap. You feel better.' },
      { id: 'guest', label: 'Invite a friend to sit with you', icon: '🧑‍🤝‍🧑', action: 'guest', guest: true, steps: [{ posture: 'sit', seconds: 8 }], stay: 'sit', doneMsg: 'Zobo, chin chin and good gist.' },
    ] },
  { id: 'tv', loc: 'home', at: [1000.7, 1], label: 'TV', kind: 'action', slot: 'tv', req: ['tv', 1], hit: [1005.7, 1, 0.5, 1.25, 2.3], seat: SOFA, stand: [1000.7, 1],
    options: [{ id: 'tv', label: 'Watch TV', icon: '📺', action: 'tv', steps: [{ posture: 'sit_tv', seconds: 6 }], stay: 'sit_tv', doneMsg: 'Nollywood marathon.' }] },
  { id: 'desk-chair', loc: 'home', at: [997.7, 3.8], label: 'Desk', kind: 'action', hit: [996, 4.3, 1.15, 0.8, 1], seat: { x: 996, z: 3.8, yaw: 0 }, stand: [997.5, 3.8],
    options: [
      { id: 'sit', label: 'Sit at the desk', icon: '🪑', action: 'rest', steps: [{ posture: 'sit', seconds: 4 }], stay: 'sit', doneMsg: 'Quiet moment.' },
      { id: 'nap', label: 'Rest your head and nap', icon: '💤', action: 'nap', steps: [{ posture: 'nap', seconds: 8 }], stay: 'sit', doneMsg: 'A short nap. You feel better.' },
    ] },
  { id: 'shower', loc: 'home', at: [1004.2, 4], label: 'Bathroom', kind: 'action', hit: [1004.2, 5.1, 0.9, 0.9, 2.4], seat: { x: 1004.2, z: 4.3, yaw: 0 }, stand: [1004.2, 3.6],
    options: [{ id: 'shower', label: 'Wash up', icon: '🚿', action: 'shower', steps: [{ posture: 'shower', seconds: 5 }], doneMsg: 'Fresh and clean.' }] },
  { id: 'exit-work', loc: 'office', at: [2000, 4.9], label: 'Door', kind: 'enter', hit: [2000, 5.2, 1, 0.6, 0.3], to: { loc: 'outside', x: 40, z: -28.2, yaw: 0 } },
  { id: 'work-desk', loc: 'office', at: [2001.5, -0.6], label: 'Your desk', kind: 'action', hit: [2000, -2.1, 1.4, 1.1, 1.3], seat: { x: 2000, z: -1, yaw: P }, stand: [2001.5, -0.6],
    options: [
      { id: 'work', label: 'Start a 20-minute shift', icon: '💼', action: 'work', when: 'offShift', steps: [{ posture: 'type', seconds: 2 }], stay: 'type' },
      { id: 'end', label: 'End shift (no pay)', icon: '🛑', when: 'onShift', special: 'end-shift' },
    ] },
];

/** Storeys are derived from height so rendering, camera collision and tests agree. */
export const floorsOf = (b: Bldg) => Math.max(1, Math.round(b.h / 3.3));
export const SOLID_BOXES = SOLIDS.map((b) => ({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, h: floorsOf(b) * 3.3 + 2 }));

/* ---------------- streets and districts ---------------- */
// The roads run on a grid (x = north-south roads, z = east-west roads). Names are real Lagos streets, placed roughly where they sit in the city:
// Marina on the lagoon at the south, Ikeja streets up north, the Lekki-Epe road out east.
export const STREETS = {
  ns: [{ at: -100, name: 'Badagry Expressway' }, { at: -60, name: 'Adeniran Ogunsanya Street' }, { at: -20, name: 'Herbert Macaulay Way' }, { at: 20, name: 'Awolowo Road' }, { at: 60, name: 'Ahmadu Bello Way' }, { at: 100, name: 'Lekki-Epe Expressway' }],
  ew: [{ at: -100, name: 'Obafemi Awolowo Way' }, { at: -60, name: 'Allen Avenue' }, { at: -20, name: 'Ikorodu Road' }, { at: 20, name: 'Western Avenue' }, { at: 60, name: 'Broad Street' }, { at: 100, name: 'Marina' }],
};
/** The street you are on, or null if you are not on a road. */
export function streetAt(x: number, z: number): string | null {
  for (const r of STREETS.ns) if (Math.abs(x - r.at) < 4.5) return r.name;
  for (const r of STREETS.ew) if (Math.abs(z - r.at) < 4.5) return r.name;
  return null;
}
export type District = 'Ikeja' | 'Yaba' | 'Surulere' | 'Ajegunle' | 'Lagos Island' | 'Victoria Island' | 'Lekki';
export function districtAt(x: number, z: number): District {
  if (z < -60) return 'Ikeja';
  if (z > 60) return x > 20 ? 'Victoria Island' : 'Lagos Island';
  if (x > 60) return 'Lekki';
  if (x < -60) return 'Ajegunle';
  return z < 0 ? 'Yaba' : 'Surulere';
}
