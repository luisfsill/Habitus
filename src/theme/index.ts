import { Platform, type TextStyle, useColorScheme } from "react-native";

/**
 * Palette from the ui-ux-pro-max design system ("calm lavender + mindful
 * green"), mapped onto iOS system greys. Text colours meet WCAG AA (4.5:1)
 * on their backgrounds; `success`/`warm` fills are paired with darker text
 * variants where they carry text on light surfaces.
 */
const light = {
  background: "#F2F2F7",
  surface: "#FFFFFF",
  surfaceGlass: "rgba(255,255,255,0.72)",
  fill: "rgba(120,120,128,0.12)",
  label: "#111118",
  secondaryLabel: "#5B5B66",
  separator: "rgba(60,60,67,0.18)",
  accent: "#7C3AED",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(124,58,237,0.12)",
  accentText: "#6D28D9",
  success: "#059669",
  successText: "#047857",
  successSoft: "rgba(5,150,105,0.14)",
  warm: "#B45309",
  danger: "#C62828",
  ringTrack: "rgba(124,58,237,0.14)",
  shadow: "#1E1033",
};

const dark: typeof light = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceGlass: "rgba(28,28,30,0.72)",
  fill: "rgba(120,120,128,0.24)",
  label: "#F5F5F7",
  secondaryLabel: "#A1A1AA",
  separator: "rgba(84,84,88,0.6)",
  accent: "#A78BFA",
  onAccent: "#1E1033",
  accentSoft: "rgba(167,139,250,0.18)",
  accentText: "#C4B5FD",
  success: "#34D399",
  successText: "#34D399",
  successSoft: "rgba(52,211,153,0.18)",
  warm: "#FBBF24",
  danger: "#F87171",
  ringTrack: "rgba(167,139,250,0.2)",
  shadow: "#000000",
};

export type Palette = typeof light;
export const palettes = { light, dark };

export function useTheme(): { colors: Palette; scheme: "light" | "dark" } {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
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
