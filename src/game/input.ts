// Keyboard + mouse (pointer lock) and touch controls (joystick, look-drag, buttons).
export const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;

export class Input {
  keys = new Set<string>();
  move = { x: 0, y: 0 };      // touch joystick
  lookDX = 0; lookDY = 0;     // accumulated look delta (radians)
  mineHeld = false;
  jumpHeld = false; downHeld = false;
  sprint = false;
  usePressed = false;         // one-shot
  wheel = 0;
  enabled = false;
  locked = false;
  sensitivity = 1;
  onKey: ((code: string) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      this.keys.add(e.code);
      if (e.code === 'Space') { e.preventDefault(); }
      this.onKey?.(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mineHeld = false; });

    canvas.addEventListener('mousedown', e => {
      if (isTouch || !this.enabled) return;
      if (!this.locked) { canvas.requestPointerLock?.(); return; }
      if (e.button === 0) this.mineHeld = true;
      if (e.button === 2) this.usePressed = true;
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.mineHeld = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (!this.locked) this.mineHeld = false; });
    addEventListener('mousemove', e => {
      if (!this.locked || !this.enabled) return;
      this.lookDX -= e.movementX * 0.0024 * this.sensitivity;
      this.lookDY -= e.movementY * 0.0024 * this.sensitivity;
    });
    addEventListener('wheel', e => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }

  axis() {
    let fx = this.move.x, fz = this.move.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) fx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) fx += 1;
    return { fx, fz };
  }
  jump() { return this.jumpHeld || this.keys.has('Space'); }
  down() { return this.downHeld || this.keys.has('KeyC') || this.keys.has('ControlLeft'); }
  sprinting() { return this.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Math.hypot(this.move.x, this.move.y) > 0.95; }
  takeUse() { const u = this.usePressed; this.usePressed = false; return u; }

  /** Bind the on-screen touch controls. */
  bindTouch(stick: HTMLElement, knob: HTMLElement, btn: { jump: HTMLElement; mine: HTMLElement; use: HTMLElement; down: HTMLElement }) {
    let sid: number | null = null, cx = 0, cy = 0; const R = 46;
    stick.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; sid = t.identifier;
      const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      e.preventDefault();
      this.updateStick(t.clientX - cx, t.clientY - cy, R, knob);
    }, { passive: false });
    stick.addEventListener('touchmove', e => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === sid) this.updateStick(t.clientX - cx, t.clientY - cy, R, knob);
      e.preventDefault();
    }, { passive: false });
    const end = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === sid) { sid = null; this.move.x = this.move.y = 0; knob.style.transform = ''; } };
    stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);

    // look by dragging anywhere that isn't a control
    let lid: number | null = null, lx = 0, ly = 0;
    this.canvas.addEventListener('touchstart', e => {
      if (!this.enabled) return;
      for (const t of Array.from(e.changedTouches)) { if (lid === null) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } }
    }, { passive: true });
    addEventListener('touchmove', e => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === lid) {
        this.lookDX -= (t.clientX - lx) * 0.0062 * this.sensitivity;
        this.lookDY -= (t.clientY - ly) * 0.0062 * this.sensitivity;
        lx = t.clientX; ly = t.clientY;
      }
    }, { passive: true });
    const lend = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === lid) lid = null; };
    addEventListener('touchend', lend); addEventListener('touchcancel', lend);

    const hold = (el: HTMLElement, set: (v: boolean) => void) => {
      el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); set(true); el.classList.add('down'); }, { passive: false });
      const up = (e: Event) => { e.preventDefault(); set(false); el.classList.remove('down'); };
      el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
    };
    hold(btn.jump, v => (this.jumpHeld = v));
    hold(btn.mine, v => (this.mineHeld = v));
    hold(btn.down, v => (this.downHeld = v));
    btn.use.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.usePressed = true; btn.use.classList.add('down'); }, { passive: false });
    btn.use.addEventListener('touchend', () => btn.use.classList.remove('down'));
  }
  private updateStick(dx: number, dy: number, R: number, knob: HTMLElement) {
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / R);
    this.move.x = dx / d * k; this.move.y = dy / d * k;
    knob.style.transform = `translate(${this.move.x * R}px, ${this.move.y * R}px)`;
  }
}
