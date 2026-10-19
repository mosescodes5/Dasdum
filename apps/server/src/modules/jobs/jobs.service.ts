import { PrismaClient } from '@prisma/client';
import { gameDay, gameHour, gameMinutes, inWindow } from '../../../../../packages/game-core/src/clock';
import { XP_PER_SHIFT, levelFor } from '../../../../../packages/game-core/src/level';
import { presence } from '../../realtime/presence';
import { postEntry, withRetry, type Db } from '../bank/bank.service';
import { getEconomy } from '../economy/economy';
import { syncNeeds } from '../life/life.service';

export type JobErrorCode = 'NOT_EMPLOYED' | 'OUTSIDE_SHIFT_HOURS' | 'DAILY_SHIFTS_DONE' | 'TOO_TIRED' | 'REQUIREMENTS_NOT_MET' | 'NO_SUCH_JOB'
  | 'ALREADY_EMPLOYED' | 'TOO_SOON_TO_QUIT' | 'NOT_AT_WORK' | 'SHIFT_ACTIVE' | 'NO_ACTIVE_SHIFT' | 'SHIFT_NOT_FINISHED';
export class JobError extends Error { constructor(public code: JobErrorCode, msg?: string) { super(msg ?? code); } }
export const QUIT_AFTER_MS = 24 * 60 * 60_000; // you may quit once you've held a job for one full day

/** Lock the employment row: two parallel requests can never both pass the same check. */
async function lockEmp(tx: Db, characterId: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Employment" WHERE "characterId" = ${characterId} FOR UPDATE`;
  if (!locked.length) throw new JobError('NOT_EMPLOYED');
  return tx.employment.findUniqueOrThrow({ where: { id: locked[0].id }, include: { job: true } });
}

/** Begin a shift. You must be standing in the workplace (the realtime server says where you are), inside the job's hours, and rested. */
export async function startShift(prisma: PrismaClient, characterId: string, nowMs = Date.now()) {
  return withRetry(() => prisma.$transaction(async (tx) => {
    const eco = await getEconomy(tx), gm = gameMinutes(nowMs), day = gameDay(gm), hour = gameHour(gm);
    const emp = await lockEmp(tx, characterId);
    if (emp.shiftStartedAt && nowMs - emp.shiftStartedAt.getTime() < (eco.shiftMinutes + 5) * 60_000) throw new JobError('SHIFT_ACTIVE');
    if (presence.get(characterId)?.loc !== 'office') throw new JobError('NOT_AT_WORK');
    if (!inWindow(hour, emp.job.shiftStartHour, emp.job.shiftEndHour)) throw new JobError('OUTSIDE_SHIFT_HOURS');
    if ((emp.lastShiftDay === day ? emp.shiftsToday : 0) >= eco.shiftsPerDay) throw new JobError('DAILY_SHIFTS_DONE');
    await syncNeeds(tx, characterId, nowMs); // apply elapsed hunger/energy decay first
    const en = await tx.$queryRaw<{ energy: number }[]>`
      UPDATE "Character" SET energy = energy - ${eco.shiftEnergyCost}, hunger = GREATEST(hunger - 6, 0), stress = LEAST(stress + 3, 100)
      WHERE id = ${characterId} AND energy >= ${eco.minEnergyToWork} AND energy >= ${eco.shiftEnergyCost} RETURNING energy`;
    if (!en.length) throw new JobError('TOO_TIRED');
    await tx.employment.update({ where: { id: emp.id }, data: { shiftStartedAt: new Date(nowMs) } });
    return { startedAt: nowMs, endsAt: nowMs + eco.shiftMinutes * 60_000 };
  }, { timeout: 8000 }));
}

/** Pay for a COMPLETED shift. Too early, or you left the workplace: no pay. */
export async function finishShift(prisma: PrismaClient, characterId: string, nowMs = Date.now()) {
  return withRetry(() => prisma.$transaction(async (tx) => {
    const eco = await getEconomy(tx);
    const emp = await lockEmp(tx, characterId);
    if (!emp.shiftStartedAt) throw new JobError('NO_ACTIVE_SHIFT');
    const started = emp.shiftStartedAt.getTime();
    if (nowMs - started < eco.shiftMinutes * 60_000 - 3000) throw new JobError('SHIFT_NOT_FINISHED'); // 3s of slack for network delay
    if (presence.get(characterId)?.loc !== 'office') throw new JobError('NOT_AT_WORK');
    const acct = await tx.bankAccount.findUniqueOrThrow({ where: { characterId } });
    const day = gameDay(gameMinutes(started)), done = emp.lastShiftDay === day ? emp.shiftsToday : 0;

    const gross = emp.job.monthlySalaryKobo / BigInt(eco.workDaysPerMonth * eco.shiftsPerDay); // a full working day = shiftsPerDay shifts
    const tax = (gross * BigInt(eco.incomeTaxBps)) / 10_000n, net = gross - tax;
    const pay = await postEntry(tx, {
      accountId: acct.id, amountKobo: net, type: 'SALARY', description: `Salary — ${emp.job.title}`,
      idempotencyKey: `shift:${characterId}:${started}`, meta: { grossKobo: gross.toString(), taxKobo: tax.toString(), day },
    });
    const before = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
    const xp = before.xp + XP_PER_SHIFT, level = levelFor(xp), levelUp = level > before.level ? level : null;
    const ch = await tx.character.update({ where: { id: characterId }, data: { reputation: { increment: 0.3 }, xp, level } });

    const shifts = emp.shiftsWorked + 1;
    if (emp.job.skillKey && shifts % 2 === 0) await tx.characterSkill.upsert({
      where: { characterId_key: { characterId, key: emp.job.skillKey } },
      create: { characterId, key: emp.job.skillKey, level: 1 }, update: { level: { increment: 1 } } });

    // Promotion is decided server-side from several systems, not XP alone.
    let promotedTo: string | null = null, jobId = emp.jobId;
    const next = await tx.job.findUnique({ where: { occupationId_rank: { occupationId: emp.job.occupationId, rank: emp.job.rank + 1 } } });
    if (next) {
      const sk = next.skillKey ? await tx.characterSkill.findUnique({ where: { characterId_key: { characterId, key: next.skillKey } } }) : null;
      if (shifts >= next.minShifts && ch.level >= next.minLevel && ch.reputation >= next.minReputation && (!next.skillKey || (sk?.level ?? 0) >= next.minSkill)) { jobId = next.id; promotedTo = next.title; }
    }
    await tx.employment.update({ where: { id: emp.id }, data: { shiftsWorked: shifts, lastShiftDay: day, shiftsToday: done + 1, shiftStartedAt: null, jobId } });
    return { grossKobo: gross, taxKobo: tax, netKobo: net, newBalanceKobo: pay.balanceAfterKobo, promotedTo, levelUp };
  }, { timeout: 8000 }));
}

/** Abandon the running shift (no pay). Also called by the realtime server when you leave the workplace or disconnect. Never throws. */
export async function endShiftNow(prisma: PrismaClient, characterId: string) {
  const r = await prisma.employment.updateMany({ where: { characterId, shiftStartedAt: { not: null } }, data: { shiftStartedAt: null } });
  return { cancelled: r.count > 0 };
}

/** Quit your job. Allowed once you've held it for a full day. */
export async function quitJob(prisma: PrismaClient, characterId: string, nowMs = Date.now()) {
  return withRetry(() => prisma.$transaction(async (tx) => {
    const emp = await lockEmp(tx, characterId);
    if (nowMs - emp.startedAt.getTime() < QUIT_AFTER_MS) throw new JobError('TOO_SOON_TO_QUIT');
    await tx.employment.delete({ where: { id: emp.id } }); // any running shift goes with it
    return { quit: true, title: emp.job.title };
  }, { timeout: 8000 }));
}

/** Entry-level jobs anyone can apply for, with whether YOU qualify. */
export async function listOpenings(prisma: PrismaClient, characterId: string) {
  const [jobs, ch] = await Promise.all([
    prisma.job.findMany({ where: { rank: 0 }, include: { occupation: true }, orderBy: { monthlySalaryKobo: 'desc' } }),
    prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { reputation: true, level: true } }),
  ]);
  return jobs.map((j) => ({
    id: j.id, title: j.title, field: j.occupation.name, monthlySalaryKobo: j.monthlySalaryKobo, startHour: j.shiftStartHour, endHour: j.shiftEndHour,
    minReputation: j.minReputation, minLevel: j.minLevel, eligible: ch.reputation >= j.minReputation && ch.level >= j.minLevel,
  }));
}

export async function applyForJob(prisma: PrismaClient, characterId: string, jobId: string) {
  return withRetry(() => prisma.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new JobError('NO_SUCH_JOB');
    if (await tx.employment.findUnique({ where: { characterId } })) throw new JobError('ALREADY_EMPLOYED'); // quit first
    const ch = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
    if (job.rank !== 0 || ch.reputation < job.minReputation || ch.level < job.minLevel) throw new JobError('REQUIREMENTS_NOT_MET');
    return tx.employment.create({ data: { characterId, jobId } });
  }, { timeout: 8000 }));
}
