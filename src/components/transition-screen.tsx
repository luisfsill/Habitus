import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { palettes, pinned, space } from "@/theme";

import { AppText } from "./app-text";
import { HorizonBackground } from "./horizon-background";
import { Icon } from "./icon";

export type TransitionPhase = "in" | "out";

interface Props {
  phase: TransitionPhase;
  /** True once the account is in the state the curtain announces. */
  landed: boolean;
  /** Called when the sequence has played and `landed` is true: time to unmount. */
  onDone: () => void;
}

const STEP_MS = 650;
const HOLD_MS = 650;
const RING = 112;
const DOT = 22;
const { accent, success } = palettes.dark;
const TRACK = "rgba(255,255,255,0.12)";

const SCRIPT: Record<TransitionPhase, { title: string; finished: string; steps: string[] }> = {
  in: {
    title: "Preparando o aplicativo",
    finished: "Tudo pronto",
    steps: ["Confirmando sua conta", "Buscando seu progresso", "Organizando seus lembretes"],
  },
  out: {
    title: "Saindo da conta",
    finished: "Até a próxima",
    steps: ["Salvando seu progresso", "Encerrando a sessão"],
  },
};

/** Arc that spins while work is pending; a static arc when the user prefers reduced motion. */
function Spinner({ size, stroke, color }: { size: number; stroke: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) turn.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1));
  }, [turn, reduceMotion]);
  const spinning = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));

  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Animated.View style={[{ width: size, height: size }, spinning]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={TRACK} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
        />
      </Svg>
    </Animated.View>
  );
}

/** Full-screen night-sky curtain shown while signing in or out: a spinner over a checklist that ticks off step by step. */
export function TransitionScreen({ phase, landed, onDone }: Props) {
  const { title, finished, steps } = SCRIPT[phase];
  const [done, setDone] = useState(0);
  const complete = done >= steps.length;

  useEffect(() => {
    if (complete) return;
    const next = setTimeout(() => setDone((count) => count + 1), STEP_MS);
    return () => clearTimeout(next);
  }, [done, complete]);

  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!complete) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const hold = setTimeout(() => setPlayed(true), HOLD_MS);
    return () => clearTimeout(hold);
  }, [complete]);
  useEffect(() => {
    if (played && landed) onDone();
  }, [played, landed, onDone]);

  return (
    <Animated.View
      exiting={FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, pinned, styles.root]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={complete ? finished : title}>
      <HorizonBackground />
      <View style={styles.content}>
        <View style={styles.ring}>
          {complete ? (
            <Animated.View entering={ZoomIn.springify().damping(11)} style={[styles.ring, styles.successRing]}>
              <Icon ios="checkmark" android="check" size={52} color={success} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(250)}>
              <Spinner size={RING} stroke={6} color={accent} />
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <AppText variant="headline" style={styles.white} maxFontSizeMultiplier={1}>
                  {done + 1}/{steps.length}
                </AppText>
              </View>
            </Animated.View>
          )}
        </View>

        <AppText key={String(complete)} variant="title2" align="center" style={styles.white}>
          {complete ? finished : title}
        </AppText>

        <View style={styles.steps}>
          {steps.map((step, index) => {
            const state = index < done ? "done" : index === done ? "active" : "pending";
            return (
              <Animated.View key={step} entering={FadeInDown.delay(index * 80).duration(300)} style={styles.step}>
                <View style={styles.dot}>
                  {state === "done" && (
                    <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.doneDot}>
                      <Icon ios="checkmark" android="check" size={14} color="#000000" />
                    </Animated.View>
                  )}
                  {state === "active" && <Spinner size={DOT} stroke={2.5} color={accent} />}
                  {state === "pending" && <View style={styles.pendingDot} />}
                </View>
                <AppText variant="body" style={[styles.white, { opacity: state === "pending" ? 0.45 : 1 }]}>
                  {step}
                </AppText>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000000", zIndex: 20 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl },
  ring: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  successRing: { borderRadius: RING / 2, borderWidth: 6, borderColor: success, backgroundColor: "rgba(52,211,153,0.12)" },
  center: { alignItems: "center", justifyContent: "center" },
  white: { color: "#FFFFFF" },
  steps: { gap: space.md, marginTop: space.sm },
  step: { flexDirection: "row", alignItems: "center", gap: space.md },
  dot: { width: DOT, height: DOT, alignItems: "center", justifyContent: "center" },
  doneDot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: success, alignItems: "center", justifyContent: "center" },
  pendingDot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, borderColor: TRACK },
});
