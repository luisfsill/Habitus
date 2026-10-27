import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, space } from "@/theme";

import { AppText } from "./app-text";
import { ProgressRing } from "./progress-ring";

export type FirePhase = "intro" | "running" | "done" | "out";

interface Props {
  phase: FirePhase;
  seconds: number;
  /** The countdown reached zero. */
  onTimerEnd: () => void;
  /** Blows so far that were too weak to put the fire out. */
  attempts: number;
}

const EMBER = "#FF8A2A";

const shadow = { textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } };

/** Small countdown ring in the top-right corner, out of the way of the fire. Time comes from timestamps. */
function MiniTimer({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState(seconds);
  const ended = useRef(onEnd);
  useEffect(() => {
    ended.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    const endsAt = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0);
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        ended.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);
  return (
    <View style={[pinned, styles.timer, { top: insets.top + space.sm }]}>
      <ProgressRing progress={1 - left / seconds} size={58} stroke={4} color={EMBER} duration={950} accessibilityLabel={`${left} segundos restantes`}>
        <AppText variant="footnote" style={[styles.digits, shadow]}>
          {left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : String(left)}
        </AppText>
      </ProgressRing>
    </View>
  );
}

/**
 * Foco total after the intro (fire-intro.tsx): nothing but the fire and a small corner timer, then a single line
 * asking to blow it out. Blowing is the only way to finish; the back arrow leaves without finishing.
 */
export function FireFocus({ phase, seconds, onTimerEnd, attempts }: Props) {
  const insets = useSafeAreaInsets();
  if (phase === "running") return <MiniTimer seconds={seconds} onEnd={onTimerEnd} />;
  if (phase !== "done") return null;
  return (
    <Animated.View entering={FadeIn.duration(600)} exiting={FadeOut.duration(400)} style={[pinned, styles.blow, { bottom: insets.bottom + space.xxl * 2 }]}>
      {/* After two blows that were too weak, ask for a stronger one (the keyed line fades in anew). */}
      <Animated.View key={attempts >= 2 ? "harder" : "blow"} entering={FadeIn.duration(500)}>
        <AppText variant="title2" align="center" accessibilityLiveRegion="polite" style={shadow}>
          {attempts >= 2 ? "Sopre um pouco mais forte" : "Sopre para apagar a fogueira"}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  timer: { right: space.lg, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.35)" },
  digits: { color: "#FFFFFF", fontWeight: "700", fontVariant: ["tabular-nums"] },
  blow: { left: space.xl, right: space.xl, alignItems: "center", gap: space.sm },
});
