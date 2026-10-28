import { type RefObject, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { BREATH_MS, breathingIn, climbStep, initialClimb, paused } from "@/domain/summit";
import { pinned, space } from "@/theme";

import { AppText } from "./app-text";
import { PrimaryButton } from "./primary-button";
import { SceneHint, SceneShell } from "./scene-shell";
import { textShadow } from "./spoken-phrase";
import { VideoBackdrop } from "./video-backdrop";

const VIDEO = require("../../assets/videos/postura.mp4") as number;
const DAWN = "#FFC86B";

interface Props {
  subtitle: string;
  title: string;
  instruction: string;
  why?: string;
  seconds: number;
  /** Where the altitude stands, before today's session and after it. */
  lineBefore: string;
  lineAfter: string;
  /** Already done today when the screen opened: the summit shows reached. */
  done: boolean;
  /** Live phone movement, 0…1 (0 without a motion sensor). */
  shake: RefObject<number>;
  /** Começar was tapped: start listening to the motion sensor. */
  onStart: () => void;
  /** The two minutes were climbed: the tip is done. */
  onDone: () => void;
  onClose: () => void;
}

/** The clouds below the summit, parting as the climb goes up. */
function Clouds({ clear }: { clear: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="clouds" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.35" stopColor="#F4F6FA" stopOpacity={0} />
          <Stop offset="0.75" stopColor="#F4F6FA" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#E9EDF3" stopOpacity={0.95} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#clouds)" opacity={1 - clear} />
    </Svg>
  );
}

/** Right edge: the climb so far, a flag going up. */
function Altitude({ progress }: { progress: number }) {
  return (
    <View pointerEvents="none" style={[pinned, styles.track]}>
      <View style={[styles.fill, { height: `${progress * 100}%` }]} />
      <View style={[styles.flag, { bottom: `${progress * 100}%` }]} />
    </View>
  );
}

/** A circle that grows while breathing in and shrinks while breathing out, with the word to follow. */
function Breath({ inhale }: { inhale: boolean }) {
  const reduceMotion = useReducedMotion();
  const size = useSharedValue(0.6);
  useEffect(() => {
    size.set(withTiming(inhale ? 1 : 0.6, { duration: reduceMotion ? 0 : BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }));
  }, [inhale, reduceMotion, size]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: size.get() }] }));
  return (
    <View style={styles.breath} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.circle, style]} />
      <AppText variant="title2" style={[styles.breathWord, textShadow]}>
        {inhale ? "Inspire" : "Solte"}
      </AppText>
    </View>
  );
}

const clock = (ms: number) => {
  const s = Math.max(Math.ceil(ms / 1000), 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The climb: steps a few times a second from Começar, pausing while the phone shakes, until the two minutes. */
function useClimb(started: boolean, total: number, shake: RefObject<number>, onDone: () => void) {
  const [climb, setClimb] = useState(initialClimb);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const reached = climb.ms >= total;
  useEffect(() => {
    if (!started || reached) return;
    const id = setInterval(() => {
      const t = Date.now();
      setStartedAt((s) => s || t);
      setNow(t);
      setClimb((c) => climbStep(c, t, shake.current));
    }, 100);
    return () => clearInterval(id);
  }, [started, reached, shake]);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (reached) onDoneRef.current();
  }, [reached]);
  return { climb, reached, elapsed: now - startedAt, isPaused: paused(climb, now) };
}

type Stage = "intro" | "climbing" | "summit" | "done";

function stageOf(reached: boolean, done: boolean, started: boolean): Stage {
  if (reached) return "summit";
  if (done) return "done";
  return started ? "climbing" : "intro";
}

function Footer({ stage, onStart, onClose }: { stage: Stage; onStart: () => void; onClose: () => void }) {
  if (stage === "summit") return <PrimaryButton label="Pronto" glow onPress={onClose} />;
  if (stage === "done") return <PrimaryButton label="Concluída hoje ✓" disabled onPress={onClose} />;
  if (stage === "climbing") return null;
  return <PrimaryButton label="Começar" glow accessibilityHint="Começa os 2 minutos de subida" onPress={onStart} />;
}

/**
 * Postura de poder: the mountain above the clouds. Two minutes standing firm, breathing with the guide; the flag
 * climbs while the phone stays still and pauses when it shakes, the clouds part, and the session adds altitude to
 * the person's mountains (domain/summit.ts).
 */
export function SummitTrick(props: Props) {
  const { subtitle, title, instruction, why, seconds, lineBefore, lineAfter, done, shake, onStart, onDone, onClose } = props;
  const [started, setStarted] = useState(false);
  const total = seconds * 1000;
  const { climb, reached, elapsed, isPaused } = useClimb(started, total, shake, onDone);
  const progress = Math.min(done ? 1 : climb.ms / total, 1);
  const backdrop = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <VideoBackdrop source={VIDEO} />
      <Clouds clear={progress} />
    </View>
  );
  const stage = stageOf(reached, done, started);
  const line = { intro: lineBefore, climbing: `${clock(total - climb.ms)} até o cume`, summit: lineAfter, done: lineAfter }[stage];
  const start = () => {
    onStart();
    setStarted(true);
  };
  return (
    <SceneShell backdrop={backdrop} subtitle={subtitle} title={title} line={line} footer={<Footer stage={stage} onStart={start} onClose={onClose} />}>
      {stage === "intro" && <SceneHint>{instruction}</SceneHint>}
      {stage === "intro" && why && <SceneHint>{why}</SceneHint>}
      {stage === "climbing" && <Breath inhale={breathingIn(elapsed)} />}
      {stage === "climbing" && isPaused && <SceneHint>Fique firme: a subida pausou.</SceneHint>}
      {stage !== "intro" && <Altitude progress={progress} />}
    </SceneShell>
  );
}

const styles = StyleSheet.create({
  breath: { alignItems: "center", justifyContent: "center", height: 200, marginTop: space.xl },
  circle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  breathWord: { color: "#FFFFFF" },
  track: { right: 14, top: "22%", bottom: "22%", width: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  fill: { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: 2, backgroundColor: DAWN },
  flag: { position: "absolute", left: -6, width: 16, height: 16, marginBottom: -8, borderRadius: 8, backgroundColor: DAWN, borderWidth: 2, borderColor: "#FFFFFF" },
});
