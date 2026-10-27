import { createContext, useContext } from "react";
import { Platform, type TextStyle, useColorScheme, useWindowDimensions, type ViewStyle } from "react-native";

/**
 * Cobalt accent with mindful green, mapped onto iOS system greys. Text
 * colours meet WCAG AA (4.5:1) on their backgrounds; `success`/`warm` fills are paired with darker text
 * variants where they carry text on light surfaces.
 */
const light = {
  background: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceGlass: "rgba(255,255,255,0.72)",
  fill: "rgba(120,120,128,0.12)",
  label: "#111118",
  secondaryLabel: "#5B5B66",
  separator: "rgba(60,60,67,0.18)",
  accent: "#1D5BD8",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(29,91,216,0.12)",
  accentText: "#1A4FBF",
  success: "#059669",
  successText: "#047857",
  successSoft: "rgba(5,150,105,0.14)",
  warm: "#B45309",
  danger: "#C62828",
  /** Fill behind white text or icons on destructive buttons (swipe delete); 6.5:1 with white in both themes. */
  destructive: "#B91C1C",
  ringTrack: "rgba(29,91,216,0.14)",
  /** Off track of a switch: iOS system grey, ≥3:1 against the card (WCAG 1.4.11). */
  switchOff: "#8E8E93",
  shadow: "#0A1A3F",
};

const dark: typeof light = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceGlass: "rgba(30,41,59,0.72)",
  fill: "rgba(120,120,128,0.24)",
  label: "#F5F5F7",
  secondaryLabel: "#A1A1AA",
  separator: "rgba(84,84,88,0.6)",
  accent: "#3D7BFF",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(61,123,255,0.18)",
  accentText: "#8FB3FF",
  success: "#34D399",
  successText: "#34D399",
  successSoft: "rgba(52,211,153,0.18)",
  warm: "#FBBF24",
  danger: "#F87171",
  destructive: "#B91C1C",
  ringTrack: "rgba(61,123,255,0.2)",
  switchOff: "#636366",
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
 * Page backdrop: one flat colour, so the status bar, the page and the strip the installed iPhone
 * app fills below the page all match. Theme-toggle paints its own gradients on top.
 */
export const backdrops: Record<"light" | "dark", ViewStyle> = {
  light: { backgroundColor: light.background },
  dark: { backgroundColor: dark.background },
};

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
