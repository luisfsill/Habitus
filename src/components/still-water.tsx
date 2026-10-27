import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { palettes } from "@/theme";

interface Props {
  scheme: "light" | "dark";
}

const DEEP = { light: "#B9DCEE", dark: "#03263F" };
const LIGHT = { light: "#FFFFFF", dark: "#38BDF8" };

/**
 * Still water: a depth gradient that returns to the flat backdrop colour at both edges and a soft glow of light from
 * the surface. No shader: it is the native page backdrop (water-backdrop.tsx) and the sign-in/out curtain on every
 * platform, so the web never runs a second water shader over the one behind the app.
 */
export function StillWater({ scheme }: Props) {
  const base = palettes[scheme].background;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={base} />
            <Stop offset="0.5" stopColor={DEEP[scheme]} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
          <RadialGradient id="sun" cx="30%" cy="0%" rx="80%" ry="45%">
            <Stop offset="0" stopColor={LIGHT[scheme]} stopOpacity={scheme === "dark" ? 0.18 : 0.6} />
            <Stop offset="1" stopColor={LIGHT[scheme]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#depth)" />
        <Rect width="100%" height="100%" fill="url(#sun)" />
      </Svg>
    </View>
  );
}
