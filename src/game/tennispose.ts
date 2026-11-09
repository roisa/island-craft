// Tennis strokes for a blocky rig (you and Baby Mo), laid over the walking
// pose each frame. All angles are in the rig's own space: it faces +z, and the
// racket arm (armR) hangs at +x.
//
// An arm hanging straight down, turned out by `rotation.z = π/2`, points
// sideways along +x; a turn about y (φ) then sweeps it round level with the
// shoulders: φ = 0 points to the racket side, −π/2 to the front, +π/2 behind,
// ±π to the other side. That makes the swings simple sweeps of φ.
//
// - forehand: turn the shoulders to the racket side, the racket back; swing
//   low to high across the front and finish over the other shoulder.
// - backhand (two hands): turn the other way, both hands back on the other
//   side; swing across the front and finish high on the racket side.
// - serve: the toss arm lifts the ball while the racket goes up behind the
//   head; then up, over and down across the body.
import * as THREE from 'three';
import type { Rig } from './models';

export type Stroke = 'ready' | 'toss' | 'fh' | 'bh' | 'serve';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** keyframes [u, value] → value at u */
function keys(k: [number, number][], u: number) {
  if (u <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const t = (u - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return lerp(k[i - 1][1], k[i][1], ease(t)); }
  return k[k.length - 1][1];
}
const H = Math.PI / 2;

/** the angles for a stroke at progress u (0 … 1); `toss` uses u as how far the toss has gone */
export function strokeAngles(kind: Stroke, u: number) {
  u = Math.max(0, Math.min(1, u));
  switch (kind) {
    case 'ready': // racket held in front, the other hand on the throat
      return { body: 0, bodyX: 0.08, armR: [-0.75, 0, 0.25], armL: [-0.7, 0, -0.35] };
    case 'fh': {
      const phi = keys([[0, 0.7], [0.3, 0.55], [0.55, -1.35], [1, -2.5]], u);
      const lift = keys([[0, H - 0.3], [0.5, H - 0.05], [1, H + 0.75]], u);
      const body = keys([[0, 0.75], [0.3, 0.8], [0.6, -0.15], [1, -0.65]], u);
      return { body, bodyX: 0.12, armR: [0, phi, lift], armL: [keys([[0, -1.3], [0.5, -0.9], [1, -0.3]], u), 0, -0.3] };
    }
    case 'bh': {
      const phi = keys([[0, 2.35], [0.3, 2.3], [0.6, 4.55], [1, 5.45]], u);
      const lift = keys([[0, H - 0.25], [0.55, H], [1, H + 0.6]], u);
      const body = keys([[0, -0.8], [0.3, -0.85], [0.6, 0.15], [1, 0.6]], u);
      // both hands on the racket: the left arm points the same way as the right
      return { body, bodyX: 0.12, armR: [0, phi, lift], armL: [0, phi, lift] };
    }
    case 'toss': // the ball goes up from the left hand, the racket goes up behind
      return { body: 0.35 * u, bodyX: -0.12 * u, armR: [keys([[0, 0.2], [1, 2.55]], u), 0, 0.25], armL: [keys([[0, -0.3], [1, -2.9]], u), 0, -0.15] };
    case 'serve': { // from the trophy pose: up, hit high, over and down across the body
      const x = keys([[0, 2.55], [0.25, Math.PI + 0.15], [1, 2 * Math.PI + 0.55]], u);
      const body = keys([[0, 0.35], [0.3, 0], [1, -0.55]], u);
      const bodyX = keys([[0, -0.12], [0.3, 0.05], [0.7, 0.32], [1, 0.1]], u);
      return { body, bodyX, armR: [x, 0, 0.2], armL: [keys([[0, -2.9], [0.4, -1.2], [1, -0.4]], u), 0, -0.2] };
    }
  }
}

/**
 * Put a stroke on a rig (after its walking pose has been set this frame).
 * The racket is held in the arm on the rig's −x side (`armL`), so seen from
 * behind the player holds it in the right hand: everything is mirrored
 * (x → −x: turns about y and z change sign).
 */
export function applyStroke(r: Rig, kind: Stroke, u: number) {
  const a = strokeAngles(kind, u);
  r.body.rotation.y = -a.body; r.body.rotation.x += a.bodyX;
  r.armL?.rotation.set(a.armR[0], -a.armR[1], -a.armR[2]);
  r.armR?.rotation.set(a.armL[0], -a.armL[1], -a.armL[2]);
}
/** a holder for the racket in the racket hand (the arm on the −x side), at the same place as the other hand */
export function racketHand(r: Rig): THREE.Object3D | null {
  const arm = r.armL; if (!arm) return null;
  const h = arm.getObjectByName('racketHand'); if (h) return h;
  const g = new THREE.Group(); g.name = 'racketHand';
  if (r.hand) g.position.copy(r.hand.position); else g.position.set(0, -0.55, 0.06);
  arm.add(g);
  return g;
}
