import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';

// Admin-editable via EconomyConfig rows. Defaults keep a fresh DB playable.
const Schema = z.object({
  workDaysPerMonth: z.number().int().min(1).max(31).default(26),
  incomeTaxBps: z.number().int().min(0).max(5000).default(500), // 5.00%
  maxTransferNaira: z.number().int().positive().default(5_000_000),
  shiftEnergyCost: z.number().int().min(0).max(100).default(12),
  minEnergyToWork: z.number().int().min(0).max(100).default(20),
  shiftMinutes: z.number().int().min(1).max(120).default(20),   // real minutes you must stay at work to be paid
  shiftsPerDay: z.number().int().min(1).max(12).default(4),     // a full working day = this many shifts
});
export type Economy = z.infer<typeof Schema>;

let cache: { at: number; v: Economy } | null = null;
export async function getEconomy(db: PrismaClient | Prisma.TransactionClient): Promise<Economy> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  const rows = await db.economyConfig.findMany();
  const v = Schema.parse(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  cache = { at: Date.now(), v };
  return v;
}
export const invalidateEconomyCache = () => { cache = null; }; // call from the admin "save" endpoint
