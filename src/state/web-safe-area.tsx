import { type ReactNode, useEffect, useState } from "react";
import { type EdgeInsets, SafeAreaInsetsContext } from "react-native-safe-area-context";

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Reads env(safe-area-inset-*) off a probe element, as insets of the layout viewport. The installed iPhone app
 * lays the page out one top inset shorter than the screen (innerHeight 793 on 852pt) and clips painting there,
 * so the home indicator falls inside the clipped band and the bottom inset shrinks by it.
 */
function measure(): EdgeInsets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;height:100vh;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const clipped = Math.max(0, parseFloat(style.height) - window.innerHeight);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: Math.max(0, (parseFloat(style.paddingBottom) || 0) - clipped),
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Safe-area insets on the web, straight from CSS. Expo Router's web provider hands out zeros, and the library's
 * own clamps them against window.innerHeight, which the installed iPhone app reports one top inset short of the
 * screen (793 of 852pt): that inflated the bottom inset by 59pt and floated the tab bar.
 */
export function WebSafeAreaInsets({ children }: { children: ReactNode }) {
  const [insets, setInsets] = useState(ZERO);
  useEffect(() => {
    const update = () => setInsets(measure());
    // After the first layout, so hydration renders the same markup as the static export.
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, []);
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}
