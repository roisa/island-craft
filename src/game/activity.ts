// A place you can play at (archery, basketball, the horse course, the ice
// rink…). The game shows its button when you're near, hands it your taps
// while it's on, lets it hold you in place, pose you and Baby Mo, and point
// the camera.
import type * as THREE from 'three';
import type { Rig } from './models';

export interface Activity {
  readonly id: string;
  active: boolean;
  /** close enough to show its button */
  near(p: THREE.Vector3): boolean;
  /** the button: an icon and a label */
  button(): [string, string];
  /** the button was tapped */
  open(): void;
  /** every frame, on or not (horses grazing…) */
  idle?(dt: number, t: number): void;
  /** ✋ or a tap on the screen while it's on */
  tap(): void;
  /** every frame while on; true while it holds you in place (your normal walking is off) */
  step(dt: number, t: number): boolean;
  quit(): void;
  /** pose you (after your walking pose) */
  pose?(r: Rig, t: number): void;
  /** pose Baby Mo */
  moPose?(r: Rig, t: number): void;
  /** point the camera; true when it did */
  camera?(cam: THREE.PerspectiveCamera): boolean;
}
