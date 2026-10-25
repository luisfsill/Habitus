import { useEffect, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { ClipPath, Defs, G, LinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

import { type } from "@/theme";

import { AppText } from "./app-text";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const FONT = { ...type.largeTitle, fontWeight: "800" as const };

interface Props {
  before: string;
  highlight: string;
  after?: string;
}

/** Large title whose highlighted word is a cobalt-to-cyan gradient with a light sweeping across. */
export function ShimmerTitle({ before, highlight, after = "" }: Props) {
  const reduce = useReducedMotion();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!reduce) sweep.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1));
  }, [reduce, sweep]);

  const band = box.width * 0.5;
  const shine = useAnimatedProps(() => ({ x: -band + sweep.get() * (box.width + band) }));
  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.width || height !== box.height) setBox({ width, height });
  };
  const baseline = FONT.fontSize + (FONT.lineHeight - FONT.fontSize) / 2 - 4;

  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${before} ${highlight}${after}`}>
      <AppText variant="largeTitle" style={styles.text}>
        {before}
      </AppText>
      <View style={styles.row}>
        <View>
          {/* Invisible copy sizes the gradient word to the real font. */}
          <AppText variant="largeTitle" style={[styles.text, styles.hidden]} onLayout={measure}>
            {highlight}
          </AppText>
          {box.width > 0 && (
            <Svg width={box.width} height={box.height} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="word" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#3D7BFF" />
                  <Stop offset="1" stopColor="#5FD4FF" />
                </LinearGradient>
                <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                  <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.85} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
                <ClipPath id="letters">
                  <SvgText x={0} y={baseline} fontSize={FONT.fontSize} fontWeight={FONT.fontWeight} fontFamily={FONT.fontFamily}>
                    {highlight}
                  </SvgText>
                </ClipPath>
              </Defs>
              <G clipPath="url(#letters)">
                <Rect width={box.width} height={box.height} fill="url(#word)" />
                {!reduce && <AnimatedRect y={0} width={band} height={box.height} fill="url(#shine)" animatedProps={shine} />}
              </G>
            </Svg>
          )}
        </View>
        {after ? (
          <AppText variant="largeTitle" style={styles.text}>
            {after}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: "#FFFFFF", fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  hidden: { opacity: 0 },
});
