import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

const GRID = 11;
const BOX = 180;
const PAD = 14;
const STEPS = ["Conferindo o plano", "Criando a cobrança no PagBank", "Preparando o QR Code"] as const;
/**
 * One scan pass, top to bottom at a constant speed. The steps tick at a third and two thirds of the first pass; the
 * Pix is shown at the end of a pass (`SCAN_PASS_MS` in state/pix-checkout.ts), so the last tick lands with the scan
 * at the bottom. A slow server just gets more passes.
 */
const SCAN_PASS_MS = 3600;
const STEP_MS = SCAN_PASS_MS / 3;

const isFinder = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c >= GRID - 3) || (r >= GRID - 3 && c < 3);
/** A fixed scatter of "modules" so the drawing looks like a QR without being one. */
const CELLS = Array.from({ length: GRID * GRID }, (_, i) => {
  const r = Math.floor(i / GRID);
  const c = i % GRID;
  return { key: i, finder: isFinder(r, c), on: isFinder(r, c) || (r * 7 + c * 13 + r * c) % 5 < 2, group: (r + 2 * c) % 3 };
});

function usePulse(delay: number, still: boolean) {
  const v = useSharedValue(still ? 1 : 0.15);
  useEffect(() => {
    if (still) return;
    const half = { duration: 800, easing: Easing.inOut(Easing.quad) };
    const timer = setTimeout(() => v.set(withRepeat(withSequence(withTiming(1, half), withTiming(0.15, half)), -1)), delay);
    return () => clearTimeout(timer);
  }, [v, delay, still]);
  return useAnimatedStyle(() => ({ opacity: v.get() }));
}

/** The QR drawing assembling itself, with one slow scan from top to bottom. */
function AssemblingQr({ done }: { done: boolean }) {
  const { colors } = useTheme();
  const still = useReducedMotion();
  const pulses = [usePulse(0, still), usePulse(530, still), usePulse(1060, still)];
  const scan = useSharedValue(0);
  useEffect(() => {
    if (!still) scan.set(withRepeat(withTiming(1, { duration: SCAN_PASS_MS, easing: Easing.linear }), -1));
  }, [scan, still]);
  // Done arrives at the end of a pass: hold the line at the bottom instead of starting the next one.
  useEffect(() => {
    if (!done) return;
    cancelAnimation(scan);
    scan.set(1);
  }, [done, scan]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: scan.get() * (BOX - 2 * PAD) }] }));
  const ink = "#0A2A44";
  return (
    <View style={styles.qr} importantForAccessibility="no-hide-descendants">
      <View style={styles.grid}>
        {CELLS.map(({ key, finder, on, group }) =>
          on ? <Animated.View key={key} style={[styles.cell, { backgroundColor: ink }, !finder && pulses[group]]} /> : <View key={key} style={styles.cell} />,
        )}
      </View>
      {!still && <Animated.View style={[styles.scan, { backgroundColor: colors.accent }, line]} />}
    </View>
  );
}

/** One step: a green tick when done, a spinner while running, an empty circle before. */
function Step({ label, state }: { label: string; state: "done" | "running" | "waiting" }) {
  const { colors } = useTheme();
  return (
    <View style={styles.step}>
      <View style={styles.mark}>
        {state === "done" ? (
          // Mounted once per step (same key), so only the new tick pops; the earlier ones stay put.
          <Animated.View entering={ZoomIn.duration(300)}>
            <Icon ios="checkmark.circle.fill" android="check_circle" size={20} color={colors.success} />
          </Animated.View>
        ) : state === "running" ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <View style={[styles.empty, { borderColor: colors.separator }]} />
        )}
      </View>
      <AppText variant="subheadline" color={state === "waiting" ? "secondaryLabel" : "label"}>
        {label}
      </AppText>
    </View>
  );
}

/** "Gerando o seu Pix": the QR assembling, a slow scan and three steps; `done` ticks the last one and ends the scan. */
export function PixGenerating({ done }: { done: boolean }) {
  const [timed, setTimed] = useState(0);
  useEffect(() => {
    const timers = [1, 2].map((n) => setTimeout(() => setTimed(n), n * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, []);
  const current = done ? STEPS.length : timed;
  return (
    <View style={styles.root} accessibilityLiveRegion="polite" accessibilityLabel={done ? "Pix pronto" : "Gerando o seu Pix"}>
      <AssemblingQr done={done} />
      <View style={styles.head}>
        <AppText variant="title2" align="center">
          Gerando o seu Pix
        </AppText>
        <AppText variant="footnote" color="secondaryLabel" align="center">
          Leva só alguns segundos
        </AppText>
      </View>
      <View style={styles.steps}>
        {STEPS.map((label, i) => (
          <Step key={label} label={label} state={i < current ? "done" : i === current ? "running" : "waiting"} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: space.xl, paddingTop: space.lg },
  qr: { width: BOX, height: BOX, padding: PAD, borderRadius: 18, backgroundColor: "#FFFFFF", overflow: "hidden" },
  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 3 },
  cell: { width: (BOX - 2 * PAD - 3 * (GRID - 1)) / GRID, aspectRatio: 1, borderRadius: 2 },
  scan: { position: "absolute", left: 8, right: 8, top: PAD, height: 3, borderRadius: 2 },
  head: { gap: space.xs },
  steps: { alignSelf: "stretch", gap: space.md, paddingHorizontal: space.lg },
  step: { flexDirection: "row", alignItems: "center", gap: space.md },
  mark: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  empty: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
});
