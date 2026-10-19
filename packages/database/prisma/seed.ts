// Run: pnpm tsx packages/database/prisma/seed.ts   (safe to re-run; upserts only)
import { PrismaClient } from '@prisma/client';
import { LADDER, LEVEL_STEP, ROLES } from '../../game-core/src/roles';

const prisma = new PrismaClient();
async function main() {
  for (const r of ROLES) {
    const occ = await prisma.occupation.upsert({ where: { key: r.key }, create: { key: r.key, name: r.name }, update: { name: r.name } });
    for (let rank = 0; rank < 4; rank++) {
      const data = {
        title: r.ladder[rank], monthlySalaryKobo: BigInt(Math.round(r.monthlyNaira * LADDER.salaryMult[rank])) * 100n,
        minShifts: LADDER.minShifts[rank], minReputation: rank === 0 ? (r.entryRep ?? 0) : LADDER.minReputation[rank],
        skillKey: r.skillKey, minSkill: LADDER.minSkill[rank],
        minLevel: (r.minLevel ?? 1) + rank * LEVEL_STEP,
        shiftStartHour: r.hours?.[0] ?? 8, shiftEndHour: r.hours?.[1] ?? 18, // shifts may START in this window (Lagos time)
      };
      // update:{} on purpose — never overwrite values an admin has tuned.
      await prisma.job.upsert({ where: { occupationId_rank: { occupationId: occ.id, rank } }, create: { occupationId: occ.id, rank, ...data }, update: {} });
    }
  }
  const defaults = { workDaysPerMonth: 26, incomeTaxBps: 500, maxTransferNaira: 5_000_000, shiftEnergyCost: 12, minEnergyToWork: 20, shiftMinutes: 20, shiftsPerDay: 4 };
  for (const [key, value] of Object.entries(defaults))
    await prisma.economyConfig.upsert({ where: { key }, create: { key, value }, update: {} });
  console.log('Seeded', ROLES.length, 'occupations and economy config');
}
main().finally(() => prisma.$disconnect());
