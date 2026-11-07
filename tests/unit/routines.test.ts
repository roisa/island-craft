import { describe, it, expect } from 'vitest';
import { ROUTINES, routineAt, PLACES, GREETINGS } from '../../src/game/routines';

describe('villager routines', () => {
  it('each day plan covers every hour from 0 to 24 with no gaps', () => {
    for (const [id, plan] of Object.entries(ROUTINES)) {
      expect(plan[0].from, id).toBe(0); expect(plan[plan.length - 1].to, id).toBe(24);
      for (let i = 1; i < plan.length; i++) expect(plan[i].from, `${id} #${i}`).toBe(plan[i - 1].to);
    }
  });
  it('everyone sleeps from an hour after Isha until Fajr, and is up during the day', () => {
    for (const id of Object.keys(ROUTINES)) {
      expect(routineAt(id, 21, 19.3, 4.6).act).toBe('sleep');
      expect(routineAt(id, 2, 19.3, 4.6).act).toBe('sleep');
      expect(routineAt(id, 10, 19.3, 4.6).act).not.toBe('sleep');
      expect(routineAt(id, 19.5, 19.3, 4.6).act).not.toBe('sleep'); // just after Isha: still awake
    }
  });
  it('Bu Aminah sells at the market in the morning; Kakek Yusuf sits on the plaza', () => {
    expect(routineAt('aminah', 9).at).toBe('market');
    expect(routineAt('aminah', 9).act).toBe('sell');
    expect(routineAt('yusuf', 9).act).toBe('sit');
  });
  it('wraps hours outside 0–24 and handles unknown villagers', () => {
    expect(routineAt('aminah', 33).at).toBe(routineAt('aminah', 9).at);
    expect(routineAt('nobody', 9).at).toBe('plazaC');
  });
  it('every place is inside the village and every activity has something to say', () => {
    for (const p of Object.values(PLACES)) expect(Math.hypot(p.x, p.z)).toBeLessThan(30);
    for (const plan of Object.values(ROUTINES)) for (const s of plan) expect(GREETINGS[s.act].length).toBeGreaterThan(0);
  });
});
