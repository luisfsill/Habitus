import { type RefObject, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";

import { initialSmile, SMILE_MS, smileStep, speciesOf } from "@/domain/garden";
import { pinned, space } from "@/theme";

import { PrimaryButton } from "./primary-button";
import { SceneHint, SceneShell } from "./scene-shell";
import { VideoBackdrop } from "./video-backdrop";

const VIDEO = require("../../assets/videos/sorria.mp4") as number;
/** The meadow shows at most this many of the latest flowers. */
const SHOWN = 42;

interface Props {
  subtitle: string;
  title: string;
  instruction: string;
  why?: string;
  /** Flowers in the meadow before today's. */
  flowers: number;
  lineBefore: string;
  lineAfter: string;
  /** Already smiled today when the screen opened: the sun is up and today's flower is there. */
  done: boolean;
  /** The camera can watch for the smile; else only holding the sun. */
  canSee: boolean;
  watching: boolean;
  /** Live smile score, 0…1. */
  score: RefObject<number>;
  /** Começar was tapped with a camera: start watching. */
  onWatch: () => void;
  /** The sun is all the way up: the tip is done. */
  onLit: () => void;
  onClose: () => void;
}

function rand(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** One flower: a stem, five petals and a heart, in its species' colours. */
function Flower({ x, y, size, index }: { x: number; y: number; size: number; index: number }) {
  const { petals, heart } = speciesOf(index);
  const r = size / 2;
  return (
    <>
      <Line x1={x} y1={y} x2={x} y2={y + size * 1.4} stroke="#3F7D3A" strokeWidth={Math.max(size / 8, 1)} />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2 + index;
        return <Circle key={k} cx={x + Math.cos(a) * r * 0.75} cy={y + Math.sin(a) * r * 0.75} r={r * 0.55} fill={petals} />;
      })}
      <Circle cx={x} cy={y} r={r * 0.4} fill={heart} />
    </>
  );
}

/** The meadow at the bottom: a flower per day smiled, in fixed places; today's grows in when it is planted. */
function Meadow({ flowers, planted }: { flowers: number; planted: boolean }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(0);
  useEffect(() => {
    if (planted) grow.set(withTiming(1, { duration: reduceMotion ? 0 : 1200, easing: Easing.out(Easing.back(1.6)) }));
  }, [planted, reduceMotion, grow]);
  const style = useAnimatedStyle(() => ({ opacity: grow.get(), transform: [{ scale: 0.3 + 0.7 * grow.get() }] }));
  const place = (i: number) =>
    size && { x: size.width * (0.04 + 0.92 * rand(i, 1)), y: size.height * (0.66 + 0.17 * rand(i, 2)), size: 12 + 10 * rand(i, 3) };
  const first = Math.max(flowers - SHOWN, 0);
  const today = planted ? place(flowers) : null;
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          {Array.from({ length: flowers - first }, (_, k) => {
            const p = place(first + k);
            return p && <Flower key={first + k} index={first + k} {...p} />;
          })}
        </Svg>
      )}
      {today && (
        <Animated.View style={[StyleSheet.absoluteFill, style, { transformOrigin: `${today.x}px ${today.y}px` }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Flower index={flowers} {...today} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

/** Before sunrise the forest is in the blue of dawn; the veil lifts and a warm light climbs as the person smiles. */
function Dawn({ rise }: { rise: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="sunrise" cx="50%" cy={`${95 - 55 * rise}%`} r="60%">
          <Stop offset="0" stopColor="#FFD27A" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#FF9E4A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="#0B1630" opacity={0.7 * (1 - rise)} />
      <Rect width="100%" height="100%" fill="url(#sunrise)" opacity={0.3 + 0.7 * rise} />
    </Svg>
  );
}

/** Smiling time: steps ~10 times a second while the camera watches or the sun is held; `onLit` once at the top. */
function useSmiling(running: boolean, score: RefObject<number>, onLit: () => void) {
  const [smile, setSmile] = useState(initialSmile);
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const lit = smile.ms >= SMILE_MS;
  const active = (running || holding) && !lit;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSmile((s) => smileStep(s, Date.now(), score.current, holdingRef.current)), 100);
    return () => {
      clearInterval(id);
      setSmile((s) => ({ ...s, at: null }));
    };
  }, [active, score]);
  const onLitRef = useRef(onLit);
  useEffect(() => {
    onLitRef.current = onLit;
  }, [onLit]);
  useEffect(() => {
    if (lit) onLitRef.current();
  }, [lit]);
  const hold = (on: boolean) => {
    holdingRef.current = on;
    setHolding(on);
  };
  return { progress: Math.min(smile.ms / SMILE_MS, 1), lit, smiling: smile.at !== null && smile.at - smile.smiledAt < 400, hold };
}

type Stage = "intro" | "smiling" | "up" | "done";

function stageOf(lit: boolean, done: boolean, started: boolean): Stage {
  if (lit) return "up";
  if (done) return "done";
  return started ? "smiling" : "intro";
}

function hintFor(stage: Stage, watching: boolean, smiling: boolean): string | null {
  if (stage !== "smiling") return null;
  if (!watching) return "Sorria e segure o sol. Ele sobe enquanto você segura.";
  return smiling ? "Isso! Continue sorrindo, o sol está subindo." : `Sorria para a câmera. Sem câmera à mão, segure o sol.`;
}

function Footer({ stage, onStart, onClose }: { stage: Stage; onStart: () => void; onClose: () => void }) {
  if (stage === "up") return <PrimaryButton label="Pronto" icon={{ ios: "sun.max.fill", android: "wb_sunny" }} glow onPress={onClose} />;
  if (stage === "done") return <PrimaryButton label="Concluída hoje ✓" disabled onPress={onClose} />;
  if (stage === "smiling") return null;
  return <PrimaryButton label="Começar" glow accessibilityHint="O sol nasce enquanto você sorri" onPress={onStart} />;
}

/**
 * Sorria: the forest at dawn. While the person smiles (seen by the front camera, on the device) or holds the sun,
 * the sun rises through the trees; at the top today's flower blooms in their meadow (domain/garden.ts).
 */
export function SmileTrick(props: Props) {
  const { subtitle, title, instruction, why, flowers, lineBefore, lineAfter, done, canSee, watching, score, onWatch, onLit, onClose } = props;
  const [started, setStarted] = useState(false);
  const smile = useSmiling(watching, score, onLit);
  const stage = stageOf(smile.lit, done, started);
  const rise = done ? 1 : smile.progress;
  const start = () => {
    if (canSee) onWatch();
    setStarted(true);
  };
  const backdrop = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <VideoBackdrop source={VIDEO} />
      <Dawn rise={rise} />
      <Meadow flowers={done ? flowers + 1 : flowers} planted={smile.lit} />
    </View>
  );
  const hint = hintFor(stage, watching, smile.smiling);
  return (
    <SceneShell
      backdrop={backdrop}
      subtitle={subtitle}
      title={title}
      line={stage === "up" || stage === "done" ? lineAfter : lineBefore}
      footer={<Footer stage={stage} onStart={start} onClose={onClose} />}
    >
      {stage === "intro" && <SceneHint>{instruction}</SceneHint>}
      {stage === "intro" && why && <SceneHint>{why}</SceneHint>}
      {hint && <SceneHint>{hint}</SceneHint>}
      {stage === "smiling" && (
        <Pressable
          onPressIn={() => smile.hold(true)}
          onPressOut={() => smile.hold(false)}
          accessibilityRole="button"
          accessibilityLabel="Segurar o sol"
          accessibilityHint="Enquanto segura, o sol sobe"
          style={styles.sun}
        >
          <View style={[styles.sunDisc, { opacity: 0.5 + 0.5 * rise }]} />
        </Pressable>
      )}
    </SceneShell>
  );
}

const styles = StyleSheet.create({
  sun: { alignSelf: "center", width: 160, height: 160, marginTop: space.xl, alignItems: "center", justifyContent: "center" },
  sunDisc: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FFD27A", borderWidth: 3, borderColor: "rgba(255,255,255,0.8)" },
});
