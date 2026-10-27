import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
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
/** Dragged down this far, or flicked down this fast, the sheet closes; otherwise it springs back. */
const CLOSE_DRAG = 100;
const CLOSE_SPEED = 800;

const GRAB_SLOP = 6;

/**
 * The grabber pulls the sheet down and the backdrop fades with it. Let go far or fast enough and it glides the rest
 * of the way at the finger's speed, then closes; otherwise it springs back.
 * `dragged` turns off the exit animations, which would otherwise start again from the open position (the jump back up).
 */
function useDragToClose(onClose: () => void, distance: number) {
  const y = useSharedValue(0);
  const [dragged, setDragged] = useState(false);
  useEffect(() => {
    if (dragged) onClose();
  }, [dragged, onClose]);
  const pan = usePanGesture({
    activeOffsetY: GRAB_SLOP,
    onUpdate: (e) => {
      // Minus the slop, so the sheet starts from where it is instead of jumping to the finger.
      y.set(Math.max(0, e.translationY - GRAB_SLOP));
    },
    onDeactivate: (e) => {
      if (y.get() > CLOSE_DRAG || e.velocityY > CLOSE_SPEED) {
        const left = distance - y.get();
        const ms = Math.min(320, Math.max(160, (left / Math.max(e.velocityY, 1400)) * 1000));
        y.set(withTiming(distance, { duration: ms, easing: Easing.out(Easing.quad) }, (done) => done && scheduleOnRN(setDragged, true)));
      } else {
        y.set(withSpring(0, { damping: 22, stiffness: 260 }));
      }
    },
  });
  const follow = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, y.get() / distance) }));
  return { pan, follow, dim, dragged };
}

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
  const drag = useDragToClose(onClose, height);

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
      <Animated.View entering={FadeIn} exiting={drag.dragged ? undefined : FadeOut} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, drag.dim]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar instruções" />
        </Animated.View>
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={drag.dragged ? undefined : SlideOutDown.duration(200)}
        accessibilityViewIsModal
        style={[styles.sheet, { left: gutter, right: gutter, backgroundColor: colors.surface, paddingBottom: insets.bottom + space.lg }, drag.follow]}>
        <GestureDetector gesture={drag.pan}>
          {/* A tall, full-width strip around the bar, so a thumb finds it easily; touch-action keeps the browser from scrolling instead. */}
          <View style={[styles.grab, { touchAction: "none", cursor: "grab" } as ViewStyle]} accessibilityLabel="Arraste para baixo para fechar">
            <View style={[styles.grabber, { backgroundColor: colors.separator }]} />
          </View>
        </GestureDetector>
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
    gap: space.md,
  },
  grab: { alignSelf: "stretch", paddingTop: space.sm, paddingBottom: space.md, marginBottom: -space.md, alignItems: "center" },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  caption: { gap: 2, minHeight: 84 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 20 },
  buttons: { flexDirection: "row", gap: space.md },
  grow: { flex: 1 },
  hint: { alignItems: "center", gap: 2 },
});
