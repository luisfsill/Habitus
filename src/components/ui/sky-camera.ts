/**
 * Zoom and pan for the gratitude sky (gratitude-sky.web.tsx): two fingers pinch, the mouse wheel zooms where the
 * pointer is, one finger or the mouse drags once zoomed in, and a double tap goes back to the whole sky. A press
 * that barely moves is a tap (picks a star). Presses on buttons and fields are left alone. Web only.
 */

export interface Camera {
  /** 1 = the whole sky, up to MAX_ZOOM. */
  z: number;
  /** Pan in CSS pixels, from the sky's resting centre. */
  px: number;
  py: number;
}

const MAX_ZOOM = 5;
/** A press that moves less than this (CSS px) is a tap. */
const TAP_SLOP = 8;
const DOUBLE_TAP_MS = 300;
const CONTROLS = "button,a,input,textarea,[role=button],[role=link],[role=tab],[role=checkbox]";

/** Keeps the zoom in range and the sky on screen: at 1 nothing pans, closer in it pans up to the zoomed edge. */
function clamp(c: Camera, w: number, h: number) {
  c.z = Math.min(MAX_ZOOM, Math.max(1, c.z));
  const mx = ((c.z - 1) * w) / 2;
  const my = ((c.z - 1) * h) / 2;
  c.px = Math.min(mx, Math.max(-mx, c.px));
  c.py = Math.min(my, Math.max(-my, c.py));
}

/** Zooms by `k` keeping the sky point under `at` where it is; `centre` is the sky's resting centre on screen. */
function zoomAt(c: Camera, k: number, { x, y }: { x: number; y: number }, centre: { x: number; y: number }) {
  const z = Math.min(MAX_ZOOM, Math.max(1, c.z * k));
  const f = z / c.z;
  c.px = x - centre.x - (x - centre.x - c.px) * f;
  c.py = y - centre.y - (y - centre.y - c.py) * f;
  c.z = z;
}

/**
 * Listens on the window while `active()` says so (the sky is on screen to be looked at) and moves `cam`.
 * `centre()` gives the sky's resting centre on screen; `onTap` gets a tap's position. Returns the stop function.
 */
export function watchCamera(cam: Camera, o: { active: () => boolean; centre: () => { x: number; y: number }; onTap: (x: number, y: number) => void }) {
  const down = new Map<number, { x: number; y: number }>();
  let travel = 0;
  let pinched = false;
  let lastTap = 0;
  const fit = () => clamp(cam, window.innerWidth, window.innerHeight);
  const reset = () => Object.assign(cam, { z: 1, px: 0, py: 0 });
  const onDown = (e: PointerEvent) => {
    if (!o.active() || (e.target as Element | null)?.closest(CONTROLS)) return;
    down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (down.size === 1) [travel, pinched] = [0, false];
  };
  const onMove = (e: PointerEvent) => {
    const before = down.get(e.pointerId);
    if (!before) return;
    const [a, b] = [...down.values()];
    if (down.size >= 2) {
      // Pinch: zoom by the change in finger spread around their midpoint, and follow the midpoint as it moves.
      const other = a === before ? b : a;
      const spread = Math.hypot(before.x - other.x, before.y - other.y);
      const now = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (spread > 0) zoomAt(cam, now / spread, { x: (e.clientX + other.x) / 2, y: (e.clientY + other.y) / 2 }, o.centre());
      cam.px += (e.clientX - before.x) / 2;
      cam.py += (e.clientY - before.y) / 2;
      pinched = true;
    } else if (cam.z > 1) {
      cam.px += e.clientX - before.x;
      cam.py += e.clientY - before.y;
    }
    travel += Math.hypot(e.clientX - before.x, e.clientY - before.y);
    down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    fit();
  };
  const onUp = (e: PointerEvent) => {
    if (!down.delete(e.pointerId) || down.size > 0 || pinched || travel > TAP_SLOP) return;
    if (e.timeStamp - lastTap < DOUBLE_TAP_MS) {
      reset();
      lastTap = 0;
      return;
    }
    lastTap = e.timeStamp;
    o.onTap(e.clientX, e.clientY);
  };
  const onWheel = (e: WheelEvent) => {
    if (!o.active()) return;
    e.preventDefault();
    zoomAt(cam, Math.exp(-e.deltaY * 0.0015), { x: e.clientX, y: e.clientY }, o.centre());
    fit();
  };
  const onCancel = (e: PointerEvent) => down.delete(e.pointerId);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("wheel", onWheel);
  };
}
