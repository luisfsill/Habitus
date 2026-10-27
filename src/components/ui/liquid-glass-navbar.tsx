/**
 * Liquid glass navbar, from Nimbus UI "Waterline" by guglielmogiannattasio.it.
 * A pill of water: the active drop stretches toward the item you pick, splits into droplets on long jumps and
 * merges back with a ripple. The cursor lifts a meniscus, every tap sends a wave along the pill, and each icon
 * plays its own little scene. The water is a small WebGL shader drawn only inside the pill and paused off-screen;
 * without WebGL a CSS drop stands in. Web only (DOM). Trimmed to what the app uses: always controlled, buttons
 * only (no links), no tap sound.
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

export function LiquidNavbar({ items, active, onChange, tone = "light", compact, label = "Navegação", style }: LiquidNavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const st = useRef(makeWaterState());
  const lastWidth = useRef(-1);
  const [fx, setFx] = useState({ i: -1, n: 0 });

  const loop = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      stepWater(s, dt, now);
      drawWater(s, dropRef.current);
      const busy = s.moving || s.rips.length > 0 || s.sats.length > 0 || s.mouse.s > 0.01;
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

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const p = local(e.clientX, e.clientY);
    Object.assign(st.current.mouse, { x: p.x, y: p.y, on: true });
    loop();
  };

  return (
    <nav
      ref={navRef}
      className="nimbus-nav"
      data-tone={tone}
      data-compact={compact === undefined ? undefined : String(compact)}
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerMove={onMove}
      onPointerLeave={() => {
        st.current.mouse.on = false;
        loop();
      }}
      onPointerDown={(e) => {
        const p = local(e.clientX, e.clientY);
        ripple(p.x, p.y, 0.8);
      }}
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
            onClick={() => select(i)}>
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
