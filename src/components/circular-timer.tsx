import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { PrimaryButton } from "./primary-button";
import { ProgressRing } from "./progress-ring";

interface Props {
  seconds: number;
  /** Called once when the countdown reaches zero. */
  onFinish?: () => void;
  /** Smaller ring, for screens with a scene under it. */
  compact?: boolean;
}

type Phase = "idle" | "running" | "paused" | "finished";

function label(remaining: number): string {
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
}

/** Countdown ring. Time comes from timestamps, so a late tick never drifts. */
export function CircularTimer({ seconds, onFinish, compact }: Props) {
  const { colors } = useTheme();
  const [remaining, setRemaining] = useState(seconds);
  const [phase, setPhase] = useState<Phase>("idle");
  const endsAt = useRef(0);
  // A ref, so a new callback each render does not restart the countdown.
  const finished = useRef(onFinish);
  useEffect(() => {
    finished.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const left = Math.max(Math.ceil((endsAt.current - Date.now()) / 1000), 0);
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        setPhase("finished");
        finished.current?.();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const toggle = () => {
    if (phase === "running") return setPhase("paused");
    const from = phase === "finished" ? seconds : remaining;
    endsAt.current = Date.now() + from * 1000;
    setRemaining(from);
    setPhase("running");
  };

  const buttonLabel = { idle: "Iniciar", running: "Pausar", paused: "Continuar", finished: "Recomeçar" }[phase];
  const spoken = `${Math.floor(remaining / 60)} minutos e ${remaining % 60} segundos restantes`;
  const hint = { idle: "2 minutos", running: "respire fundo", paused: "pausado", finished: "Muito bem!" }[phase];

  return (
    <View style={styles.wrap}>
      <ProgressRing
        progress={1 - remaining / seconds}
        size={compact ? 150 : 220}
        stroke={compact ? 10 : 14}
        duration={phase === "running" ? 950 : 300}
        color={phase === "finished" ? colors.success : colors.accent}
        accessibilityLabel={phase === "finished" ? "Tempo concluído" : spoken}>
        <AppText variant="largeTitle" style={styles.digits} accessibilityElementsHidden>
          {label(remaining)}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel">
          {hint}
        </AppText>
      </ProgressRing>
      <View style={styles.button}>
        <PrimaryButton label={buttonLabel} variant="tinted" onPress={toggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.lg },
  digits: { fontVariant: ["tabular-nums"] },
  button: { minWidth: 180 },
});
