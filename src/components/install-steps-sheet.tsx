import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, radius, space, useColumnGutter, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { InstallPhone } from "./install-phone";
import { SCENES, type StepsKind } from "./install-scenes";
import { PrimaryButton } from "./primary-button";

export type { StepsKind } from "./install-scenes";

/** Milliseconds each step stays on screen before the demo moves on by itself. */
const STEP_MS = 3800;

/** Bouncing arrow toward the Safari toolbar at the bottom of an iPhone. */
function ToolbarHint() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduce) y.set(withRepeat(withTiming(8, { duration: 600 }), -1, true));
  }, [y, reduce]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <View style={styles.hint} accessible accessibilityLabel="A barra do Safari fica embaixo da tela">
      <AppText variant="footnote" color="secondaryLabel">
        A barra do Safari fica aqui embaixo
      </AppText>
      <Animated.View style={bounce}>
        <Icon ios="chevron.down" android="keyboard_double_arrow_down" size={28} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

interface Props {
  kind: StepsKind;
  onClose: () => void;
  /** iPhone (not iPad): Safari's toolbar is at the bottom. */
  showToolbarHint?: boolean;
}

export function InstallStepsSheet({ kind, onClose, showToolbarHint }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gutter = useColumnGutter();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const { title, bar, scenes } = SCENES[kind];
  const [step, setStep] = useState(0);
  // Plays by itself until the person taps; then it waits for them.
  const [auto, setAuto] = useState(true);
  const [copied, setCopied] = useState(false);
  const last = step === scenes.length - 1;
  const scene = scenes[step];

  useEffect(() => {
    if (!auto || reduce || last) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [auto, reduce, last, step]);

  const go = (to: number) => {
    setAuto(false);
    setStep(to);
  };

  return (
    <View style={[StyleSheet.absoluteFill, pinned]}>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar instruções" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
        accessibilityViewIsModal
        style={[styles.sheet, { left: gutter, right: gutter, backgroundColor: colors.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: colors.separator }]} />
        <AppText variant="title2" align="center" accessibilityRole="header">
          {title}
        </AppText>
        {/* Leaves room for the text and buttons on short screens (iPhone SE). */}
        <InstallPhone bar={bar} scene={scene} height={Math.max(200, Math.min(300, height - 420))} onPress={() => go(last ? 0 : step + 1)} />
        <Animated.View key={step} entering={FadeIn.duration(250)} style={styles.caption} accessibilityLiveRegion="polite">
          <AppText variant="footnote" color="secondaryLabel" align="center">
            Passo {step + 1} de {scenes.length}
          </AppText>
          <AppText variant="headline" align="center">
            {scene.title}
          </AppText>
          <AppText variant="subheadline" color="secondaryLabel" align="center">
            {scene.detail}
          </AppText>
        </Animated.View>
        <View style={styles.dots} accessible={false}>
          {scenes.map((s, i) => (
            <View key={s.title} style={[styles.dot, { backgroundColor: i === step ? colors.accent : colors.separator }, i === step && styles.dotOn]} />
          ))}
        </View>
        {kind === "inapp" && (
          <PrimaryButton
            label={copied ? "Link copiado!" : "Copiar link"}
            variant="tinted"
            onPress={() => void navigator.clipboard?.writeText(window.location.origin).then(() => setCopied(true))}
          />
        )}
        <View style={styles.buttons}>
          {step > 0 && (
            <View style={styles.grow}>
              <PrimaryButton label="Voltar" variant="tinted" onPress={() => go(step - 1)} />
            </View>
          )}
          <View style={styles.grow}>
            <PrimaryButton label={last ? "Entendi" : "Próximo"} onPress={last ? onClose : () => go(step + 1)} />
          </View>
        </View>
        {showToolbarHint && <ToolbarHint />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: space.xs },
  caption: { gap: 2, minHeight: 84 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 20 },
  buttons: { flexDirection: "row", gap: space.md },
  grow: { flex: 1 },
  hint: { alignItems: "center", gap: 2 },
});
