export interface Needs { energy: number; hunger: number; health: number; happiness: number; stress: number }
export const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** Offline mercy: a player who was away for days isn't punished beyond 8 game hours of decay. */
export const MAX_CATCHUP_GAME_MIN = 8 * 60;

/** Rates are per REAL minute now that the clock is real: hunger empties in about 10 hours, energy in about 16. */
export function decay(n: Needs, minutes: number): Needs {
  const m = Math.max(0, Math.min(minutes, MAX_CATCHUP_GAME_MIN));
  const hunger = clamp(n.hunger - m * 0.17);
  return {
    hunger, energy: clamp(n.energy - m * 0.1), happiness: clamp(n.happiness - m * 0.04),
    stress: clamp(n.stress + m * 0.02), health: clamp(n.health - (hunger < 5 ? m * 0.05 : 0)),
  };
}
export function applyEffects(n: Needs, e: Partial<Needs>): Needs {
  const out = { ...n };
  for (const k of Object.keys(e) as (keyof Needs)[]) out[k] = clamp(out[k] + (e[k] ?? 0));
  return out;
}
