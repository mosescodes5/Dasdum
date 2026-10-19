import { describe, expect, it } from 'vitest';
import { levelFor, xpForLevel } from '../../../packages/game-core/src/level';
import { LEVEL_STEP, ROLES, SURVEY, generateCharacter } from '../../../packages/game-core/src/roles';
import { districtAt, streetAt } from '../../../packages/game-core/src/world';

describe('levels', () => {
  it('level rises with xp and xpForLevel is the exact threshold', () => {
    expect(levelFor(0)).toBe(1);
    for (let l = 2; l <= 15; l++) { expect(levelFor(xpForLevel(l))).toBe(l); expect(levelFor(xpForLevel(l) - 1)).toBe(l - 1); }
  });
  it('a shift is worth 10 xp, so level 2 takes 3 shifts and level 5 about 40', () => { expect(levelFor(30)).toBe(2); expect(levelFor(400)).toBe(5); });
});
describe('careers', () => {
  it('the survey never hands out a job you have to earn (judge, EFCC, politics, bus driver, keke)', () => {
    const locked = new Set(ROLES.filter((r) => r.startable === false).map((r) => r.key));
    expect(locked.size).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < 3000; i++) {
      const answers = SURVEY.map((q) => Math.floor(Math.random() * q.length));
      expect(locked.has(generateCharacter(answers).role.key)).toBe(false);
    }
  });
  it('every role has a four-rung ladder and the top rungs need a higher level', () => {
    for (const r of ROLES) { expect(r.ladder).toHaveLength(4); expect((r.minLevel ?? 1) + 3 * LEVEL_STEP).toBeGreaterThan(r.minLevel ?? 1); }
    expect(ROLES.find((r) => r.key === 'court')!.ladder[3]).toBe('High Court Judge');
  });
});
describe('streets', () => {
  it('names the road you are standing on, and not the blocks between roads', () => {
    expect(streetAt(20, 0)).toBe('Awolowo Road'); expect(streetAt(0, 100)).toBe('Marina'); expect(streetAt(0, 0)).toBeNull();
  });
  it('home is in Surulere and the office in Yaba', () => { expect(districtAt(-40, 40)).toBe('Surulere'); expect(districtAt(40, -40)).toBe('Yaba'); });
});
