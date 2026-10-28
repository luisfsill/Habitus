/**
 * Liquid glass navbar, from Nimbus UI "Waterline" by guglielmogiannattasio.it.
 * A pill of water: the active drop stretches toward the item you pick, splits into droplets on long jumps and
 * merges back with a ripple. The cursor lifts a meniscus, every tap sends a wave along the pill, and each icon
 * plays its own little scene. The water is a small WebGL shader drawn only inside the pill and paused off-screen;
 * without WebGL a CSS drop stands in. Web only (DOM). Trimmed to what the app uses: always controlled, buttons
 * only (no links). Dragging a finger across the pill stirs the water without switching tabs; only a tap switches.
 */
import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { NIMBUS_CSS } from "./liquid-glass-navbar.css";
import { aimWater, drawWater, initGL, makeWaterState, PAD, stepWater, supportsRefraction } from "./liquid-glass-water";

export type NimbusFx = "plane" | "drop" | "spin" | "glow" | "wave" | "pop" | "none";

export interface LiquidNavItem {
  key: string;
  label: string;
  icon?: ReactNode;
  /** The little scene the icon plays when tapped. */
  fx?: NimbusFx;
}

export interface LiquidNavbarProps {
  items: readonly LiquidNavItem[];
  active: number;
  onChange: (index: number, item: LiquidNavItem) => void;
  /** "light" water for bright backgrounds, "dark" for dark ones. */
  tone?: "light" | "dark";
  /** Icons only (labels stay for screen readers). Phones under 520px get this anyway. */
  compact?: boolean;
  label?: string;
  style?: CSSProperties;
  /** A quick tap plays `tap`; dragging across the pill stirs the water (`stir`, 0 to 1 by speed) and `settle`s on release. */
  sounds?: { tap: () => void; stir: (strength: number) => void; settle: () => void };
}

// How far a finger moves before a press stops being a tap and starts stirring the water.
const DRAG_PX = 10;
/** Frame gap for the idle water, in ms (about 30 fps). */
const AMBIENT_MS = 32;

interface Press {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t: number;
  speed: number;
  trail: number;
  dragged: boolean;
}

/** SVG noise that bends the page behind the glass (Chromium; see supportsRefraction). */
const REFRACT_FILTER = (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <filter id="nimbus-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise" />
      <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
      <feDisplacementMap in="SourceGraphic" in2="soft" scale="60" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export function LiquidNavbar({ items, active, onChange, tone = "light", compact, label = "Navegação", style, sounds }: LiquidNavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const st = useRef(makeWaterState());
  const lastWidth = useRef(-1);
  const [fx, setFx] = useState({ i: -1, n: 0 });
  const press = useRef<Press | null>(null);
  // The click that follows a drag lands on a button too: it must not switch tabs.
  const skipClick = useRef(false);

  const loop = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const busy = s.moving || s.rips.length > 0 || s.sats.length > 0 || s.mouse.s > 0.01;
      // Idle drift at about 30 frames a second, like the backdrop: 120/144 Hz screens would draw it 4-5x for nothing.
      if (!busy && now - s.last < AMBIENT_MS) {
        s.raf = s.visible && !s.reduce ? requestAnimationFrame(tick) : 0;
        return;
      }
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      stepWater(s, dt, now);
      drawWater(s, dropRef.current);
      // Ambient water keeps moving while visible; with reduced motion it only animates on change.
      s.raf = s.visible && (!s.reduce || busy) ? requestAnimationFrame(tick) : 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, []);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current[active];
    if (!nav || !el) return;
    aimWater(st.current, nav, el, canvasRef.current);
    loop();
  }, [active, loop]);

  useEffect(() => {
    const s = st.current;
    const nav = navRef.current;
    // Written straight to the DOM: they only switch CSS, nothing React renders depends on them.
    const setGl = (on: boolean) => nav?.setAttribute("data-gl", on ? "on" : "off");
    nav?.setAttribute("data-refract", supportsRefraction() ? "on" : "off");
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = canvasRef.current;
    s.glc = cv ? initGL(cv) : null;
    setGl(s.glc !== null);
    const lost = (e: Event) => {
      e.preventDefault();
      s.glc = null;
      setGl(false);
    };
    cv?.addEventListener("webglcontextlost", lost);
    const io = new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting;
      if (s.visible) loop();
    });
    if (nav) io.observe(nav);
    const shown = () => {
      s.visible = document.visibilityState === "visible";
      if (s.visible) loop();
    };
    document.addEventListener("visibilitychange", shown);
    return () => {
      cv?.removeEventListener("webglcontextlost", lost);
      io.disconnect();
      document.removeEventListener("visibilitychange", shown);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      // Free the context now instead of at garbage collection: browsers cap how many stay alive.
      s.glc?.gl.getExtension("WEBGL_lose_context")?.loseContext();
      s.glc = null;
    };
  }, [loop]);

  useLayoutEffect(() => measure(), [measure, items.length, compact]);

  useEffect(() => {
    // A new width (rotation, Admin tab appearing) snaps the drop instead of animating it.
    const ro = new ResizeObserver(() => {
      const w = navRef.current?.offsetWidth ?? 0;
      if (w === lastWidth.current) return;
      lastWidth.current = w;
      st.current.ready = false;
      measure();
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    st.current.dark = tone === "dark" ? 1 : 0;
    loop();
  }, [tone, loop]);

  const local = (clientX: number, clientY: number) => {
    const r = navRef.current?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0) + PAD, y: clientY - (r?.top ?? 0) + PAD };
  };
  const ripple = (x: number, y: number, amp: number) => {
    const s = st.current;
    if (s.reduce) return;
    s.rips.push({ x, y, age: 0, amp });
    loop();
  };
  const iconCenter = (i: number) => {
    const b = iconRefs.current[i]?.getBoundingClientRect();
    return b ? local(b.left + b.width / 2, b.top + b.height / 2) : null;
  };

  const select = (i: number) => {
    const kind = items[i].fx ?? (items[i].icon ? "pop" : "none");
    setFx((f) => ({ i, n: f.n + 1 }));
    const c = iconCenter(i);
    if (c && kind === "drop") setTimeout(() => ripple(c.x, st.current.t.cy, 1.4), 430);
    if (c && kind === "plane") ripple(c.x, c.y, 0.6);
    if (i !== active) onChange(i, items[i]);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (active + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    select(n);
    itemRefs.current[n]?.focus();
  };

  // The meniscus rises under the pointer or finger.
  const lift = (clientX: number, clientY: number) => {
    const p = local(clientX, clientY);
    Object.assign(st.current.mouse, { x: p.x, y: p.y, on: true });
    loop();
    return p;
  };
  const drop = () => {
    st.current.mouse.on = false;
    loop();
  };

  const onMove = (e: PointerEvent) => {
    let pr = press.current?.id === e.pointerId ? press.current : null;
    // Leaving the pill pauses a drag (pointerleave ends it); coming back still pressed, or pressing outside and
    // dragging in, stirs the water again.
    if (!pr && e.buttons === 1) {
      const { clientX: x, clientY: y } = e;
      pr = press.current = { id: e.pointerId, x0: x, y0: y, x, y, t: e.timeStamp, speed: 0, trail: 0, dragged: true };
    }
    if (pr) drag(pr, e.clientX, e.clientY, e.timeStamp);
    else if (e.pointerType === "mouse") lift(e.clientX, e.clientY);
  };

  const drag = (pr: Press, clientX: number, clientY: number, t: number) => {
    const p = lift(clientX, clientY);
    const step = Math.hypot(clientX - pr.x, clientY - pr.y);
    pr.speed = pr.speed * 0.7 + (step / Math.max(1, t - pr.t)) * 0.3;
    Object.assign(pr, { x: clientX, y: clientY, t });
    if (!pr.dragged && Math.hypot(clientX - pr.x0, clientY - pr.y0) < DRAG_PX) return;
    pr.dragged = true;
    // About 1.2 px/ms is a brisk swipe: full volume and the biggest waves.
    const strength = Math.min(1, pr.speed / 1.2);
    sounds?.stir(strength);
    pr.trail += step;
    if (pr.trail > 36) {
      pr.trail = 0;
      // A slow finger leaves faint ripples, a fast one waves as strong as a tap.
      ripple(p.x, p.y, 0.12 + 0.68 * strength);
    }
  };

  const endPress = (e: PointerEvent, tapped: boolean) => {
    const pr = press.current;
    if (pr?.id !== e.pointerId) return;
    press.current = null;
    if (pr.dragged) sounds?.settle();
    else if (tapped) sounds?.tap();
    skipClick.current = pr.dragged;
    setTimeout(() => (skipClick.current = false), 0);
    if (e.pointerType !== "mouse") drop();
  };

  // A swipe that starts outside the pill never reaches it as pointer events (a touch stays with the element it began on),
  // so follow touches on the window and stir the water while one is over the pill. Ids below 0 mark these presses.
  useEffect(() => {
    const overPill = (x: number, y: number) => {
      const r = navRef.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const follow = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        const id = -1 - touch.identifier;
        const pr = press.current;
        if (pr && pr.id !== id) continue;
        const { clientX: x, clientY: y } = touch;
        if (e.type === "touchmove" && overPill(x, y)) {
          const p = pr ?? { id, x0: x, y0: y, x, y, t: e.timeStamp, speed: 0, trail: 0, dragged: true };
          press.current = p;
          drag(p, x, y, e.timeStamp);
        } else if (pr) {
          press.current = null;
          sounds?.settle();
          drop();
        }
      }
    };
    window.addEventListener("touchmove", follow, { passive: true });
    window.addEventListener("touchend", follow, { passive: true });
    window.addEventListener("touchcancel", follow, { passive: true });
    return () => {
      window.removeEventListener("touchmove", follow);
      window.removeEventListener("touchend", follow);
      window.removeEventListener("touchcancel", follow);
    };
  });

  return (
    <nav
      ref={navRef}
      className="nimbus-nav"
      data-tone={tone}
      data-compact={compact === undefined ? undefined : String(compact)}
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerMove={onMove}
      onPointerLeave={(e) => {
        endPress(e, false);
        st.current.mouse.on = false;
        loop();
      }}
      onPointerDown={(e) => {
        const p = local(e.clientX, e.clientY);
        ripple(p.x, p.y, 0.8);
        const at = { x: e.clientX, y: e.clientY };
        press.current = { id: e.pointerId, x0: at.x, y0: at.y, ...at, t: e.timeStamp, speed: 0, trail: 0, dragged: false };
        // A touch sticks to the button it began on; let go of it so a finger leaving the pill pauses, like the mouse.
        const el = e.target as Element;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => endPress(e, true)}
      onPointerCancel={(e) => endPress(e, false)}
      style={style}>
      <style dangerouslySetInnerHTML={{ __html: NIMBUS_CSS }} />
      {REFRACT_FILTER}
      <span className="nimbus-glass" aria-hidden="true" />
      <canvas className="nimbus-water" ref={canvasRef} aria-hidden="true" />
      <span className="nimbus-drop" ref={dropRef} aria-hidden="true" />
      {items.map((it, i) => {
        const kind = it.fx ?? "pop";
        const playing = fx.i === i && kind !== "none";
        return (
          <button
            key={it.key}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="nimbus-item"
            aria-label={it.label}
            aria-current={i === active ? "page" : undefined}
            onClick={() => {
              if (!skipClick.current) select(i);
            }}>
            {it.icon && (
              <span
                className="nv-ico"
                key={playing ? fx.n : 0}
                data-fx={playing ? kind : undefined}
                ref={(el) => {
                  iconRefs.current[i] = el;
                }}>
                {it.icon}
              </span>
            )}
            <span className="nimbus-label">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
