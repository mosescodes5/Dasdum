import type { Needs } from './needs';
// Server-side defaults. Move to EconomyConfig later so admins can balance without a deploy.
export type ActionKey = 'sleep' | 'cook' | 'street_food' | 'tv' | 'shower' | 'rest' | 'nap' | 'guest' | 'drink';
export interface ActionDef { label: string; costNaira: number; effects: Partial<Needs>; cooldownMs: number }
export const ACTIONS: Record<ActionKey, ActionDef> = {
  sleep:       { label: 'Slept',        costNaira: 0,    effects: { energy: 65, stress: -20, hunger: -8 },  cooldownMs: 90_000 },
  cook:        { label: 'Groceries',    costNaira: 1500, effects: { hunger: 55, happiness: 2 },             cooldownMs: 20_000 },
  street_food: { label: 'Street food',  costNaira: 1500, effects: { hunger: 35, happiness: 3 },             cooldownMs: 15_000 },
  tv:          { label: 'Watched TV',   costNaira: 0,    effects: { happiness: 12, stress: -6 },            cooldownMs: 30_000 },
  shower:      { label: 'Shower',       costNaira: 200,  effects: { happiness: 3, stress: -8, health: 2 },  cooldownMs: 40_000 },
  nap:         { label: 'Napped',       costNaira: 0,    effects: { energy: 22, stress: -4, hunger: -3 },  cooldownMs: 40_000 },
  guest:       { label: 'Zobo and snacks for a friend', costNaira: 500, effects: { happiness: 14, stress: -8 }, cooldownMs: 60_000 },
  drink:       { label: 'Cold drink',   costNaira: 300,  effects: { hunger: 5, happiness: 3 },              cooldownMs: 15_000 },
  rest:        { label: 'Rested',       costNaira: 0,    effects: { stress: -4, energy: 3 },                cooldownMs: 20_000 },
};
/** Effects after your home is taken into account. The server applies exactly this; the menu shows exactly this. */
export function effectsFor(action: ActionKey, home: { bed?: number; tv?: number }): Partial<Needs> {
  const fx = { ...ACTIONS[action].effects };
  if (action === 'sleep') fx.energy = (fx.energy ?? 0) + (home.bed ?? 0) * 6;      // a better bed restores more
  if (action === 'tv') fx.happiness = (fx.happiness ?? 0) + (home.tv ?? 0) * 3;    // a better TV is more fun
  return fx;
}
