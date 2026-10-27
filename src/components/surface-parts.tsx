import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { palettes, radius, space } from "@/theme";

import { AppText } from "./app-text";

// Landing page pieces ("Superfície"): flat white type and buttons over the live water. Web only.

const { background } = palettes.dark;

/** Web-only CSS the style types do not know (react-native-web passes it through). */
export const css = (style: Record<string, unknown>) => style as ViewStyle;

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** "solid": white pill, the main action. "outline": thin white ring. */
  variant?: "solid" | "outline";
  size?: "lg" | "md";
}

/** Flat pill over the water; under the mouse a band of light crosses it, like sun on the surface. */
export function SurfaceButton({ label, onPress, variant = "solid", size = "lg" }: ButtonProps) {
  const solid = variant === "solid";
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ hovered, pressed }) => (
        <View
          style={[
            styles.pill,
            size === "lg" ? styles.lg : styles.md,
            solid ? styles.solid : [styles.outline, hovered && styles.outlineHover],
            css({ transform: `translateY(${hovered && !pressed ? -1 : 0}px) scale(${pressed ? 0.97 : 1})`, transition: "transform 160ms, background-color 200ms, border-color 200ms" }),
          ]}
        >
          {solid && <View style={[styles.shine, css({ left: hovered ? "130%" : "-60%", transition: hovered ? "left 700ms ease-out" : "none" })]} />}
          <AppText variant={size === "lg" ? "headline" : "subheadline"} style={[styles.label, { color: solid ? background : "#FFFFFF" }]}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Text link; a thin line slides in underneath under the mouse. */
export function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {({ hovered }) => (
        <View style={styles.navLink}>
          <AppText variant="subheadline" style={[styles.medium, { color: hovered ? "#FFFFFF" : "rgba(238,247,255,0.72)" }]}>
            {label}
          </AppText>
          <View style={[styles.underline, css({ width: hovered ? "100%" : "0%", transition: "width 260ms cubic-bezier(.2,.9,.25,1)" })]} />
        </View>
      )}
    </Pressable>
  );
}

/** Rises gently into place the first time it scrolls into view. */
export function Reveal({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [shown, setShown] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (shown || !el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown(true), { rootMargin: "0px 0px -12% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <View
      ref={ref}
      style={[style, css({ opacity: shown ? 1 : 0, transform: `translateY(${shown ? 0 : 28}px)`, transition: "opacity 900ms ease-out, transform 900ms cubic-bezier(.2,.9,.25,1)" })]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  lg: { minHeight: 56, paddingHorizontal: space.xl + 8 },
  md: { minHeight: 40, paddingHorizontal: space.lg + 2 },
  solid: { backgroundColor: "#FFFFFF" },
  outline: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.45)" },
  outlineHover: { borderColor: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.08)" },
  shine: { position: "absolute", top: -10, bottom: -10, width: "45%", backgroundColor: "rgba(10,124,192,0.16)", transform: [{ skewX: "-20deg" }] },
  label: { fontWeight: "700" },
  medium: { fontWeight: "500" },
  navLink: { paddingVertical: space.xs },
  underline: { position: "absolute", left: 0, bottom: 0, height: 1.5, backgroundColor: "#FFFFFF", borderRadius: 1 },
});
