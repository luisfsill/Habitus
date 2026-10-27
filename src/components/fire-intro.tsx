import { type ComponentRef, type ReactNode, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { pinned, space } from "@/theme";

import { AppText } from "./app-text";
import { burnAway, canBurn } from "./burn";
import { EmberButton } from "./ember-button";

interface Props {
  subtitle: string;
  title: string;
  instruction: string;
  why?: string;
  /** Called once the text has faded away: time to start the fire. */
  onStarted: () => void;
}

const LEAVE_MS = 1100;
const BURN_MS = 1600;
/** Each line starts leaving this much (of the whole exit) after the one above it. */
const STAGGER = 0.12;

/** One line of the intro: on exit it drifts up, grows a touch and dissolves, a little after the line above. */
function Line({ order, leave, children }: { order: number; leave: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const k = Math.min(Math.max((leave.get() - order * STAGGER) / 0.45, 0), 1);
    return { opacity: 1 - k, transform: [{ translateY: -28 * k }, { scale: 1 + 0.04 * k }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Foco total before it starts: what is about to happen, over a dark veil that covers the whole still fire. Iniciar
 * sets the veil and the text on fire (web: it burns away in patches with a glowing edge; native: the lines rise and dissolve one
 * by one), then calls `onStarted`.
 */
export function FireIntro({ subtitle, title, instruction, why, onStarted }: Props) {
  const reduceMotion = useReducedMotion();
  const leave = useSharedValue(0);
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<ComponentRef<typeof Animated.View>>(null);
  const veilRef = useRef<ComponentRef<typeof Animated.View>>(null);
  const card = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(Math.max((leave.get() - 0.35) / 0.65, 0), 1),
    transform: [{ scale: 1 - 0.05 * leave.get() }],
  }));
  // The veil only fades: scaling it would show its edges.
  const veil = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.max((leave.get() - 0.35) / 0.65, 0), 1) }));

  const start = () => {
    if (leaving) return;
    setLeaving(true);
    if (reduceMotion) return onStarted();
    if (canBurn) {
      burnAway(veilRef.current, BURN_MS, () => undefined);
      return burnAway(cardRef.current, BURN_MS, onStarted);
    }
    leave.set(withTiming(1, { duration: LEAVE_MS, easing: Easing.inOut(Easing.cubic) }));
    setTimeout(onStarted, LEAVE_MS);
  };

  return (
    <>
      {/* Covers the whole screen; the text sits on it, in the page. */}
      <Animated.View ref={veilRef} pointerEvents="none" style={[StyleSheet.absoluteFill, pinned, styles.veil, veil]} />
      <Animated.View ref={cardRef} style={[styles.card, card]}>
      <Line order={0} leave={leave}>
        <AppText variant="subheadline" color="secondaryLabel">
          {subtitle}
        </AppText>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
      </Line>
      <Line order={1} leave={leave}>
        <AppText variant="title3" style={styles.instruction}>
          {instruction}
        </AppText>
      </Line>
      {why && (
        <Line order={2} leave={leave}>
          <AppText variant="footnote" color="secondaryLabel" style={styles.label}>
            A IDEIA POR TRÁS
          </AppText>
          <AppText variant="subheadline" color="secondaryLabel">
            {why}
          </AppText>
        </Line>
      )}
      <Line order={3} leave={leave}>
        <View style={styles.start}>
          <EmberButton label="Iniciar" onPress={start} disabled={leaving} />
        </View>
      </Line>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: "rgba(4,2,4,0.84)" },
  card: { gap: space.lg },
  instruction: { fontWeight: "400", lineHeight: 28 },
  label: { fontWeight: "600", letterSpacing: 0.5, marginBottom: space.sm },
  start: { alignSelf: "center", minWidth: 200 },
});
