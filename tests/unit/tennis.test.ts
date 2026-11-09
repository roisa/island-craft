import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ballAt, aimFor, canHit, moReturns, HIT, serveResult, gameScore, TOSS } from '../../src/game/tennis';
import { COURT, courtCell } from '../../src/game/court';
import { strokeAngles } from '../../src/game/tennispose';

describe('tennis with Baby Mo', () => {
  const a = new THREE.Vector3(0, 51, 13), b = new THREE.Vector3(2, 51, -13), floor = 50.1;
  it('the ball starts at the hitter, ends at the other racket, and bounces once on the far side of the net', () => {
    expect(ballAt(0, a, b, floor).distanceTo(a)).toBeLessThan(1e-6);
    expect(ballAt(1, a, b, floor).distanceTo(b)).toBeLessThan(1e-6);
    const bounce = ballAt(0.68, a, b, floor);
    expect(bounce.y).toBeCloseTo(floor, 5);
    expect(bounce.z).toBeLessThan(0); // past the net (z = 0)
  });
  it('it clears the net', () => {
    let y = 0; for (let u = 0; u < 1; u += 0.001) { const p = ballAt(u, a, b, floor); if (Math.abs(p.z) < 0.05) { y = p.y; break; } }
    expect(y).toBeGreaterThan(floor + 1.5);
  });
  it('a serve aimed at a spot bounces right there', () => {
    const to = aimFor(a, { x: -2, z: -3 }, 51);
    const p = ballAt(0.68, a, to, floor);
    expect(p.x).toBeCloseTo(-2, 5); expect(p.z).toBeCloseTo(-3, 5);
  });
  it('a tap hits in a kind window: from just over half a second before until a moment after', () => {
    expect(canHit(0.3)).toBe(true);
    expect(canHit(HIT.before)).toBe(true);
    expect(canHit(0.9)).toBe(false);
    expect(canHit(-0.05)).toBe(true);
    expect(canHit(-0.5)).toBe(false);
  });
  it('Baby Mo returns most balls, a few less in long rallies', () => {
    expect(moReturns(0, 0.5)).toBe(true);
    expect(moReturns(0, 0.95)).toBe(false);
    expect(moReturns(10, 0.7)).toBe(false);
  });
  it('a serve hit near the top of the toss goes in; too early hits the net, too late goes long', () => {
    expect(serveResult(TOSS.peak)).toBe('in');
    expect(serveResult(0.2)).toBe('net');
    expect(serveResult(1.1)).toBe('long');
  });
  it('keeps score like real tennis: love, 15, 30, 40, deuce, advantage, game', () => {
    expect(gameScore(0, 0).call).toBe('Love all!');
    expect(gameScore(1, 0).show[1]).toBe('15 – 0');
    expect(gameScore(1, 0).call).toBe('Fifteen, love!');
    expect(gameScore(2, 3).show[1]).toBe('30 – 40');
    expect(gameScore(3, 3).call).toBe('Deuce!');
    expect(gameScore(4, 3).call).toBe('Advantage, you!');
    expect(gameScore(4, 3).won).toBeNull();
    expect(gameScore(5, 3).won).toBe('me');
    expect(gameScore(4, 1).won).toBe('me');
    expect(gameScore(2, 4).won).toBe('mo');
  });
});

describe('a real tennis court', () => {
  it('has baselines, singles and doubles sidelines, service lines, a centre line and centre marks', () => {
    const { half, singles, doubles, service } = COURT;
    expect(courtCell(0, half)).toBe('line');            // baseline
    expect(courtCell(doubles, 3)).toBe('line');         // doubles sideline
    expect(courtCell(singles, 9)).toBe('line');         // singles sideline
    expect(courtCell(2, service)).toBe('line');         // service line
    expect(courtCell(0, 3)).toBe('line');               // centre service line
    expect(courtCell(0, half - 1)).toBe('line');        // centre mark
    expect(courtCell(0, 9)).toBe('court');              // no centre line behind the service line
    expect(courtCell(5, service)).toBe('court');        // the service line stops at the singles line
    expect(courtCell(2, 3)).toBe('court');
    expect(courtCell(doubles + 1, 0)).toBe('out');
    expect(courtCell(0, half + 1)).toBe('out');
    // close to a real court: about 24 × 11 m, service line about 6.4 m from the net
    expect(2 * half).toBeGreaterThanOrEqual(23);
    expect(2 * doubles).toBeGreaterThanOrEqual(11);
    expect(service).toBeGreaterThanOrEqual(6);
  });
});

describe('natural strokes', () => {
  it('a forehand swings from the racket side, across the front, to finish over the other shoulder', () => {
    const s = strokeAngles('fh', 0), e = strokeAngles('fh', 1);
    expect(s.body).toBeGreaterThan(0.5);   // shoulders turned to the racket side first
    expect(e.body).toBeLessThan(-0.4);     // and round the other way at the end
    expect(s.armR[1]).toBeGreaterThan(0);  // racket back
    expect(e.armR[1]).toBeLessThan(-2);    // across the front to the other side
    expect(e.armR[2]).toBeGreaterThan(s.armR[2]); // low to high
  });
  it('a backhand is two-handed and swings the other way', () => {
    const s = strokeAngles('bh', 0), e = strokeAngles('bh', 1);
    expect(s.body).toBeLessThan(-0.5); expect(e.body).toBeGreaterThan(0.4);
    expect(e.armR[1]).toBeGreaterThan(s.armR[1]);
    expect(s.armL).toEqual(s.armR);       // both hands on the racket
  });
  it('a serve goes up behind the head, hits high and finishes down across the body', () => {
    const s = strokeAngles('serve', 0), hit = strokeAngles('serve', 0.25), e = strokeAngles('serve', 1);
    expect(s.armR[0]).toBeGreaterThan(2);                       // racket up behind (trophy)
    expect(hit.armR[0]).toBeCloseTo(Math.PI + 0.15, 1);         // straight up at the hit
    expect(e.armR[0]).toBeGreaterThan(2 * Math.PI);             // over and down
  });
});
