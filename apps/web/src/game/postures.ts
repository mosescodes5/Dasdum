// A posture = target values for every joint. Avatar blends smoothly between them.
// Sign conventions (Avatar converts to Three.js rotations):
//  hips/shoulder/elbow: positive = swing FORWARD · knee: positive = bend (shin goes back)
//  torso/head: positive = lean/nod forward · pitch: body rotation about the hips (-π/2 = lying on back)
//  *Lo = arm out to the side · hipsY = height of the hips above the root (feet level when standing)
import type { PostureName } from '../../../../packages/game-core/src/postures';
export type { PostureName };
const KEYS = ['hipsY', 'pitch', 'torso', 'head', 'aLs', 'aLo', 'aLe', 'aRs', 'aRo', 'aRe', 'tLh', 'tLk', 'tRh', 'tRk'] as const;
export type Joint = (typeof KEYS)[number];
export const IDX = Object.fromEntries(KEYS.map((k, i) => [k, i])) as Record<Joint, number>;
export type Pose = number[];

const STAND: Pose = [1, 0, 0, 0, 0.05, 0.1, 0.1, 0.05, 0.1, 0.1, 0, 0, 0, 0];
const mk = (o: Partial<Record<Joint, number>>): Pose => {
  const p = [...STAND];
  for (const k of Object.keys(o) as Joint[]) p[IDX[k]] = o[k]!;
  return p;
};
const SIT = { hipsY: 0.5, tLh: 1.57, tLk: 1.57, tRh: 1.57, tRk: 1.57 };

export const POSES: Record<PostureName, Pose> = {
  stand: STAND,
  sit: mk({ ...SIT, torso: 0.05, aLs: 0.5, aRs: 0.5, aLe: 0.9, aRe: 0.9 }),
  sit_tv: mk({ ...SIT, torso: -0.14, head: -0.05, aLs: 0.3, aRs: 0.3, aLe: 0.6, aRe: 0.6 }),
  nap: mk({ ...SIT, torso: 0.3, head: 0.55, aLs: 0.3, aRs: 0.3, aLe: 1.3, aRe: 1.3 }),
  type: mk({ ...SIT, torso: 0.12, head: 0.25, aLs: 0.75, aRs: 0.75, aLe: 1.25, aRe: 1.25 }),
  sleep: mk({ hipsY: 0.7, pitch: -Math.PI / 2, aLo: 0.15, aRo: 0.15 }),
  cook: mk({ torso: 0.15, head: 0.2, aLs: 1.0, aRs: 1.0, aLe: 1.0, aRe: 1.0 }),
  eat: mk({ head: 0.1, aRs: 0.5, aRe: 2.1 }),
  shower: mk({ head: -0.25, aLs: 2.7, aRs: 2.7, aLo: 0.35, aRo: 0.35, aLe: 1.1, aRe: 1.1 }),
};

// Small looping motions added on top of a held posture.
export const ANIM: Partial<Record<PostureName, (t: number) => Partial<Record<Joint, number>>>> = {
  type: (t) => ({ aLe: Math.sin(t * 14) * 0.08, aRe: Math.cos(t * 13) * 0.08, head: Math.sin(t * 0.8) * 0.05 }),
  cook: (t) => ({ aRe: Math.sin(t * 6) * 0.25, aLe: Math.cos(t * 6) * 0.1 }),
  eat: (t) => ({ aRe: -Math.max(0, Math.sin(t * 2.5)) * 0.5, head: Math.max(0, Math.sin(t * 2.5)) * 0.1 }),
  shower: (t) => ({ aLe: Math.sin(t * 8) * 0.3, aRe: Math.cos(t * 8) * 0.3 }),
  sleep: (t) => ({ torso: Math.sin(t * 1.5) * 0.02 }),
  nap: (t) => ({ torso: 0.3 + Math.sin(t * 1.2) * 0.02, head: 0.55 + Math.sin(t * 1.2) * 0.03 }),
  sit_tv: (t) => ({ head: Math.sin(t * 0.5) * 0.03 }),
};
