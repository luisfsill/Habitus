import { Pressable, StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  title: string;
  /** "Hoje às 17:00". */
  when: string;
  /** "2:14:08", "3 dias", "Agora" or "Atrasado". */
  countdown: string;
  /** 0..1: fills over the last 24 h before the reminder. */
  progress: number;
  /** Paints the countdown red. */
  overdue?: boolean;
  onPress: () => void;
}

/** The next reminder, featured at the top of the list: label, title, big countdown and a thin bar. */
export function ReminderHero({ title, when, countdown, progress, overdue, onPress }: Props) {
  const { colors } = useTheme();
  const filled = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` as const;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // No ticking countdown in the label: it would change every second while focused.
      accessibilityLabel={`${overdue ? "Lembrete atrasado" : "Próximo lembrete"}, ${when}: ${title}.`}
      accessibilityHint="Abre o lembrete"
      style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.6 : 1 }]}>
      <AppText variant="caption" color="accentText" style={styles.kicker} numberOfLines={1}>
        {`${overdue ? "Atrasado" : "Próximo"} · ${when}`.toUpperCase()}
      </AppText>
      <AppText variant="title2" numberOfLines={2}>
        {title}
      </AppText>
      <AppText variant="largeTitle" color={overdue ? "danger" : "accent"} style={styles.countdown}>
        {countdown}
      </AppText>
      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View style={[styles.fill, { width: filled, backgroundColor: overdue ? colors.danger : colors.accent }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 2, paddingVertical: space.xs },
  kicker: { letterSpacing: 0.5 },
  countdown: { fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
  track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: space.sm },
  fill: { height: "100%", borderRadius: 2 },
});
