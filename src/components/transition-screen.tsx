import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { palettes, radius, space } from "@/theme";

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

const STEP_MS = 420;
const CHECK_MS = 380;
const HOLD_MS = 700;

const SCRIPT: Record<TransitionPhase, { emoji: string; title: string; steps: string[] }> = {
  in: {
    emoji: "🌿",
    title: "Preparando o aplicativo",
    steps: ["🔐 Conta confirmada", "📊 Buscando seu progresso", "⏰ Organizando seus lembretes", "✨ Tudo pronto"],
  },
  out: {
    emoji: "👋",
    title: "Até logo",
    steps: ["💾 Salvando seu progresso", "🔒 Encerrando a sessão", "🌙 Até a próxima"],
  },
};

/** Full-screen night-sky curtain shown while signing in or out: steps appear one by one and get a green check. */
export function TransitionScreen({ phase, landed, onDone }: Props) {
  const { emoji, title, steps } = SCRIPT[phase];
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) float.set(withRepeat(withSequence(withTiming(-8, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1));
  }, [float, reduceMotion]);

  const [played, setPlayed] = useState(false);
  const lastCheck = (steps.length - 1) * STEP_MS + CHECK_MS;
  useEffect(() => {
    const tick = setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), lastCheck);
    const done = setTimeout(() => setPlayed(true), lastCheck + HOLD_MS);
    return () => {
      clearTimeout(tick);
      clearTimeout(done);
    };
  }, [lastCheck]);
  useEffect(() => {
    if (played && landed) onDone();
  }, [played, landed, onDone]);

  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));

  return (
    <Animated.View exiting={FadeOut.duration(350)} style={[StyleSheet.absoluteFill, styles.root]} accessibilityLiveRegion="polite" accessibilityLabel={title}>
      <HorizonBackground />
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={floating}>
          <AppText style={styles.emoji} maxFontSizeMultiplier={1}>
            {emoji}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <AppText variant="title1" align="center" style={styles.white}>
            {title}
          </AppText>
        </Animated.View>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <Animated.View key={step} entering={FadeInDown.delay(index * STEP_MS).springify().damping(14)} style={styles.step}>
              <AppText variant="body" style={[styles.white, styles.flex]}>
                {step}
              </AppText>
              <Animated.View entering={ZoomIn.delay(index * STEP_MS + CHECK_MS).springify().damping(9)}>
                <Icon ios="checkmark.circle.fill" android="check_circle" size={24} color={palettes.dark.success} />
              </Animated.View>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000000", zIndex: 20 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl },
  emoji: { fontSize: 72, lineHeight: 88, textAlign: "center" },
  white: { color: "#FFFFFF" },
  flex: { flex: 1 },
  steps: { width: "100%", maxWidth: 360, gap: space.sm, marginTop: space.md },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
});
