import { createContext, useContext } from "react";
import { Platform, type TextStyle, useColorScheme, useWindowDimensions, type ViewStyle } from "react-native";

/**
 * "Water glass": clear water blues with frosted glass surfaces. Text colours meet WCAG AA (4.5:1) on the page
 * backdrop and on glass over it; white text keeps 4.5:1 on `accent` and on the water buttons (`waterTop` to
 * `waterDeep`) in both themes. `success`/`warm` fills are paired with darker text variants where they carry text on light surfaces.
 */
const light = {
  background: "#E3F1F8",
  surface: "#F4FAFD",
  surfaceGlass: "rgba(244,250,253,0.72)",
  /** Frosted glass over the water: cards, fields, the footer bar. Paired with a blur behind it. */
  glass: "rgba(255,255,255,0.5)",
  /** Bright rim along the top edge of glass, where the light catches it. */
  glassRim: "rgba(255,255,255,0.9)",
  /** Thin outline around glass, so it reads on pale water. */
  glassEdge: "rgba(12,84,130,0.14)",
  fill: "rgba(3,105,161,0.08)",
  label: "#0B1B2B",
  secondaryLabel: "#3E5566",
  separator: "rgba(12,84,130,0.16)",
  accent: "#0369A1",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(3,105,161,0.12)",
  accentText: "#075985",
  /** Water inside the primary button, top to bottom (white text >= 4.5:1 on both). */
  waterTop: "#0A7CC0",
  waterDeep: "#035482",
  success: "#059669",
  successText: "#047857",
  successSoft: "rgba(5,150,105,0.14)",
  warm: "#9A4A07",
  danger: "#C62828",
  /** Fill behind white text or icons on destructive buttons (swipe delete); 6.5:1 with white in both themes. */
  destructive: "#B91C1C",
  ringTrack: "rgba(3,105,161,0.14)",
  /** Off track of a switch: >=3:1 against the glass card (WCAG 1.4.11). */
  switchOff: "#7B8794",
  shadow: "#0A3A5F",
};

const dark: typeof light = {
  background: "#041526",
  surface: "#0B2238",
  surfaceGlass: "rgba(11,34,56,0.72)",
  glass: "rgba(120,190,255,0.08)",
  glassRim: "rgba(255,255,255,0.24)",
  glassEdge: "rgba(125,211,252,0.16)",
  fill: "rgba(125,211,252,0.12)",
  label: "#EEF7FF",
  secondaryLabel: "#9FB6C8",
  separator: "rgba(125,211,252,0.18)",
  accent: "#0277B5",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(56,189,248,0.16)",
  accentText: "#7DD3FC",
  waterTop: "#0A7CC0",
  waterDeep: "#023E63",
  success: "#34D399",
  successText: "#34D399",
  successSoft: "rgba(52,211,153,0.18)",
  warm: "#FBBF24",
  danger: "#F87171",
  destructive: "#B91C1C",
  ringTrack: "rgba(56,189,248,0.2)",
  switchOff: "#5B6B7A",
  shadow: "#000000",
};

/** Width of the app column on wide (desktop/tablet) screens: pages, headers, pinned bars and sheets keep to it. */
export const MAX_WIDTH = 640;

/**
 * Room beside the app column (0 on a phone). Pinned overlays and header buttons inset by it to stay on the column:
 * an absolute box with `left`/`right` and `maxWidth` sticks to the left edge instead of centring.
 */
export function useColumnGutter(): number {
  const { width } = useWindowDimensions();
  return Math.max(0, (width - MAX_WIDTH) / 2);
}

/** Overlays pin to the viewport: on the web the document scrolls, so `absolute` would scroll away with the page. */
export const pinned: ViewStyle = { position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute" };

export type Palette = typeof light;
export const palettes = { light, dark };

/**
 * Flat backdrop colour: the status bar, the body and the strip the installed iPhone app fills below the page.
 * The pages themselves sit on water (`WaterBackdrop`), which fades into this colour at its top and bottom.
 */
export const backdrops: Record<"light" | "dark", ViewStyle> = {
  light: { backgroundColor: light.background },
  dark: { backgroundColor: dark.background },
};

/**
 * Background of navigator screens. Web: clear, so the one water canvas the root layout pins behind the app shows
 * through every screen. Native: flat, and each `Screen` paints its own water.
 */
export const stackBackdrop = (scheme: "light" | "dark"): ViewStyle => (Platform.OS === "web" ? { backgroundColor: "transparent" } : backdrops[scheme]);

export const ThemePreferenceContext = createContext<"auto" | "light" | "dark">("auto");

export function useTheme(): { colors: Palette; scheme: "light" | "dark" } {
  const preference = useContext(ThemePreferenceContext);
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const scheme = preference === "auto" ? system : preference;
  return { colors: palettes[scheme], scheme };
}

const family = Platform.select({ ios: "System", default: undefined });

/** iOS text styles (points). RN scales them with the system font size. */
export const type = {
  largeTitle: { fontFamily: family, fontSize: 34, lineHeight: 41, fontWeight: "700" },
  title1: { fontFamily: family, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title2: { fontFamily: family, fontSize: 22, lineHeight: 28, fontWeight: "700" },
  title3: { fontFamily: family, fontSize: 20, lineHeight: 25, fontWeight: "600" },
  headline: { fontFamily: family, fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontFamily: family, fontSize: 17, lineHeight: 22, fontWeight: "400" },
  callout: { fontFamily: family, fontSize: 16, lineHeight: 21, fontWeight: "400" },
  subheadline: { fontFamily: family, fontSize: 15, lineHeight: 20, fontWeight: "400" },
  footnote: { fontFamily: family, fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontFamily: family, fontSize: 12, lineHeight: 16, fontWeight: "500" },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof type;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 22, pill: 999 } as const;
/** Minimum touch target (HIG). */
export const HIT = 44;
