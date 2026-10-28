import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { pinned } from "@/theme";

import { VideoBackdrop } from "./video-backdrop";

const VIDEO = require("../../assets/videos/lua.mp4") as number;
// The video (480×1024) is cropped so its full moon stays put at this spot, with the horizon below it.
const VIDEO_W = 480;
const VIDEO_H = 1024;
const MOON_X = 240;
const MOON_Y = 234;
const HORIZON_Y = 540;
/** The drawn moon, a bit larger than the video's, so it covers it with the video's halo still around. */
const MOON_R = 30;
/** The video's moon glows in a wide haze: covered in sky colour up to here, fading out by HALO_R. */
const HALO_CORE = 150;
const HALO_R = 200;
const NIGHT = "#04060E";
/** The graded video's sky (#00001A) under the backdrop's top scrim, around the moon's height. */
const SKY = "#020412";
const MOONLIGHT = "#F4F1E6";

/** Small deterministic random numbers (0…1) for star `i`, so the sky is the same on every open. */
function rand(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Stars in video pixels: more high up than near the hazy horizon, none inside the moon's glow; a third twinkle,
// in two groups out of step.
const STARS = Array.from({ length: 170 }, (_, i) => ({
  x: rand(i, 1) * VIDEO_W,
  y: rand(i, 2) ** 1.4 * (HORIZON_Y - 25),
  r: 0.6 + 1.3 * rand(i, 3) ** 3,
  opacity: 0.3 + 0.7 * rand(i, 4),
  group: i % 6 === 0 ? 1 : i % 6 === 3 ? 2 : 0,
})).filter((s) => Math.hypot(s.x - MOON_X, s.y - MOON_Y) > MOON_R * 2.2);

type StarList = typeof STARS;

function Dots({ stars, frame, scale }: { stars: StarList; frame: SceneLayout["frame"]; scale: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      {stars.map((s, i) => (
        <Circle key={i} cx={frame.left + s.x * scale} cy={frame.top + s.y * scale} r={s.r * scale} fill="#FFFFFF" opacity={s.opacity} />
      ))}
    </Svg>
  );
}

/** The stars over the video's sky, which has none of its own. Still with "reduzir movimento". */
function Stars({ frame, scale }: { frame: SceneLayout["frame"]; scale: number }) {
  const reduceMotion = useReducedMotion();
  const twinkle = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    twinkle.set(withRepeat(withSequence(withTiming(0.2, { duration: 2200 }), withTiming(1, { duration: 2200 })), -1));
  }, [reduceMotion, twinkle]);
  const one = useAnimatedStyle(() => ({ opacity: twinkle.get() }));
  const two = useAnimatedStyle(() => ({ opacity: 1.2 - twinkle.get() }));
  return (
    <>
      <Dots stars={STARS.filter((s) => s.group === 0)} frame={frame} scale={scale} />
      <Animated.View style={[StyleSheet.absoluteFill, one]}>
        <Dots stars={STARS.filter((s) => s.group === 1)} frame={frame} scale={scale} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, two]}>
        <Dots stars={STARS.filter((s) => s.group === 2)} frame={frame} scale={scale} />
      </Animated.View>
    </>
  );
}

export interface SceneLayout {
  frame: { left: number; top: number; width: number; height: number };
  moon: { x: number; y: number; r: number };
  scale: number;
}

/**
 * Covers the screen with the video like contentFit cover, but scaled up or moved down when needed so the top of the moon sits
 * no higher than `minMoonTop` (below the header), with the video still covering the whole screen.
 */
export function sceneLayout(width: number, height: number, minMoonTop: number): SceneLayout {
  const cover = Math.max(width / VIDEO_W, height / VIDEO_H);
  const scale = Math.max(cover, (minMoonTop + MOON_R * cover) / MOON_Y);
  const w = VIDEO_W * scale;
  const h = VIDEO_H * scale;
  const centered = (height - h) / 2;
  const top = centered + MOON_Y * scale - MOON_R * scale >= minMoonTop ? centered : Math.min(0, minMoonTop + MOON_R * scale - MOON_Y * scale);
  const left = (width - w) / 2;
  return { frame: { left, top, width: w, height: h }, moon: { x: left + MOON_X * scale, y: top + MOON_Y * scale, r: MOON_R * scale }, scale };
}

/**
 * The lit part of the moon, `lit` from 0 (new) to 1 (full). Waxing as seen from Brazil (southern hemisphere): the light
 * grows from the left. The terminator is a half ellipse: on the lit side for a crescent, on the dark side past half.
 */
export function litPath(x: number, y: number, r: number, lit: number): string {
  const rx = r * Math.abs(1 - 2 * lit);
  const sweep = lit < 0.5 ? 1 : 0;
  return `M ${x} ${y - r} A ${r} ${r} 0 0 0 ${x} ${y + r} A ${rx} ${r} 0 0 ${sweep} ${x} ${y - r} Z`;
}

/** A soft burst of light from the moon each time `bloom` grows (tonight's phase filled; bigger on a full moon). */
function Bloom({ x, y, r, bloom, full }: { x: number; y: number; r: number; bloom: number; full: boolean }) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (bloom === 0 || reduceMotion) return;
    glow.set(withSequence(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 2400 })));
  }, [bloom, reduceMotion, glow]);
  const size = r * (full ? 14 : 9);
  const style = useAnimatedStyle(() => ({ opacity: glow.get(), transform: [{ scale: 0.6 + 0.4 * glow.get() }] }));
  return (
    <Animated.View style={[styles.bloom, { left: x - size / 2, top: y - size / 2, width: size, height: size }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={MOONLIGHT} stopOpacity={0.55} />
            <Stop offset="0.35" stopColor={MOONLIGHT} stopOpacity={0.18} />
            <Stop offset="1" stopColor={MOONLIGHT} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bloom)" />
      </Svg>
    </Animated.View>
  );
}

interface Props {
  layout: SceneLayout;
  /** Lit part of the moon now, 0…1. */
  lit: number;
  /** Grows by one each time a phase is filled, to play the burst. */
  bloom: number;
  full: boolean;
}

/**
 * Antes de dormir: the night sea video with the moon drawn over the video's own (always full) moon, in the person's
 * phase, crisp on a clear sky: the video's hazy halo is covered. On thin phases the path of light on the water dims.
 * Decorative.
 */
export function MoonScene({ layout, lit, bloom, full }: Props) {
  const { moon, frame, scale } = layout;
  const horizon = frame.top + HORIZON_Y * scale;
  const dark = 1 - lit;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <VideoBackdrop source={VIDEO} frame={frame} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="halo" cx={moon.x} cy={moon.y} r={HALO_R * scale} gradientUnits="userSpaceOnUse">
            <Stop offset={HALO_CORE / HALO_R} stopColor={SKY} stopOpacity={1} />
            <Stop offset="1" stopColor={SKY} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={moon.x} cy={moon.y} r={HALO_R * scale} fill="url(#halo)" />
        <Rect x={0} y={horizon} width="100%" height={Math.max(frame.top + frame.height - horizon, 0)} fill={NIGHT} opacity={0.6 * dark} />
      </Svg>
      <Stars frame={frame} scale={scale} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Just a thin rim of light, so the edge stays sharp. */}
          <RadialGradient id="glow" cx={moon.x} cy={moon.y} r={moon.r * 1.7} gradientUnits="userSpaceOnUse">
            <Stop offset={1 / 1.7} stopColor={MOONLIGHT} stopOpacity={0.3} />
            <Stop offset="1" stopColor={MOONLIGHT} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={moon.x} cy={moon.y} r={moon.r * 1.7} fill="url(#glow)" opacity={lit} />
        {/* The dark side keeps a faint earthshine, so the whole disc reads even on a new moon. */}
        <Circle cx={moon.x} cy={moon.y} r={moon.r} fill="#2B3047" />
        {lit > 0 && <Path d={litPath(moon.x, moon.y, moon.r, Math.min(lit, 1))} fill={MOONLIGHT} />}
      </Svg>
      <Bloom x={moon.x} y={moon.y} r={moon.r} bloom={bloom} full={full} />
    </View>
  );
}

const styles = StyleSheet.create({
  bloom: { position: "absolute" },
});
