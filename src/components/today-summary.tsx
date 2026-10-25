import { StyleSheet, View } from "react-native";

import { TRICK_COUNT } from "@/domain/tricks";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GlassCard } from "./glass-card";
import { ProgressRing } from "./progress-ring";

interface Props {
  count: number;
  streak: number;
  activeToday: boolean;
}

function copy(count: number, activeToday: boolean): [string, string] {
  if (count >= TRICK_COUNT) return ["Dia completo!", "Você fez todos os truques de hoje."];
  if (!activeToday) return ["Dia de descanso", "Hoje não é um dia ativo. Você pode praticar mesmo assim."];
  const left = TRICK_COUNT - count;
  return ["Seu progresso", left === 1 ? "Falta 1 truque hoje." : `Faltam ${left} truques hoje.`];
}

/** Activity-style ring with today's count and the current streak. */
export function TodaySummary({ count, streak, activeToday }: Props) {
  const { colors } = useTheme();
  const [title, body] = copy(count, activeToday);
  return (
    <GlassCard>
      <View style={styles.row}>
        <ProgressRing
          progress={count / TRICK_COUNT}
          size={132}
          stroke={16}
          color={count >= TRICK_COUNT ? colors.success : colors.accent}
          accessibilityLabel={`Progresso de hoje: ${count} de ${TRICK_COUNT} truques`}>
          <AppText variant="title1" style={styles.digits}>
            {count}/{TRICK_COUNT}
          </AppText>
        </ProgressRing>
        <View style={styles.text}>
          <AppText variant="headline">{title}</AppText>
          <AppText variant="subheadline" color="secondaryLabel">
            {body}
          </AppText>
          <AppText variant="subheadline" color="warm" style={styles.streak}>
            {streak === 1 ? "1 dia seguido" : `${streak} dias seguidos`}
          </AppText>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.lg },
  text: { flex: 1, gap: 4 },
  streak: { fontWeight: "600", marginTop: space.xs },
  digits: { fontVariant: ["tabular-nums"] },
});
