// Levels come from experience. Every completed shift earns XP; level gates which jobs you may apply for and be promoted into.
export const XP_PER_SHIFT = 10;
export const levelFor = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
export const xpForLevel = (level: number) => 25 * (level - 1) ** 2;
