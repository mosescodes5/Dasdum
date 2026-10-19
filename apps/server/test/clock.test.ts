import { describe, expect, it } from 'vitest';
import { gameDay, gameHour, gameMinutes, inWindow, lagosDate } from '../../../packages/game-core/src/clock';
import { decay } from '../../../packages/game-core/src/needs';

describe('real Lagos time', () => {
  it('the game hour is the Lagos hour (UTC+1)', () => {
    const t = Date.UTC(2026, 9, 9, 21, 39); // 21:39 UTC = 22:39 in Lagos
    expect(gameHour(gameMinutes(t))).toBe(22);
    expect(lagosDate(t).getUTCHours()).toBe(22);
  });
  it('a new game day starts at midnight in Lagos', () => {
    const before = gameDay(gameMinutes(Date.UTC(2026, 9, 9, 22, 59))), after = gameDay(gameMinutes(Date.UTC(2026, 9, 9, 23, 0)));
    expect(after).toBe(before + 1);
  });
  it('shift windows, including ones that wrap past midnight and all-day ones', () => {
    expect(inWindow(8, 8, 18)).toBe(true); expect(inWindow(18, 8, 18)).toBe(false); expect(inWindow(7, 8, 18)).toBe(false);
    expect(inWindow(23, 20, 6)).toBe(true); expect(inWindow(3, 20, 6)).toBe(true); expect(inWindow(12, 20, 6)).toBe(false);
    for (let h = 0; h < 24; h++) expect(inWindow(h, 0, 24)).toBe(true);
  });
});
describe('needs run on real time', () => {
  it('an hour barely dents you; a full day offline is capped at 8 hours of decay', () => {
    const n = { energy: 90, hunger: 90, health: 100, happiness: 60, stress: 20 };
    expect(decay(n, 60).hunger).toBeGreaterThan(75);
    expect(decay(n, 60 * 24).hunger).toBeCloseTo(decay(n, 60 * 8).hunger, 5);
    expect(decay(n, 60 * 8).hunger).toBeGreaterThan(0);
  });
});
