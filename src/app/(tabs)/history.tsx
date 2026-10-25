import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { GlassCard } from "@/components/glass-card";
import { Screen } from "@/components/screen";
import { Icon } from "@/components/icon";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import { currentStreak, doneCount, monthGrid, weekPercent } from "@/domain/history";
import { dayKey } from "@/domain/time";
import { TRICK_COUNT } from "@/domain/tricks";
import { useAppState } from "@/state/app-state";
import { HIT, radius, space, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const HEAD = ["D", "S", "T", "Q", "Q", "S", "S"];

function Stat({ value, label, color }: { value: string; label: string; color: "warm" | "accentText" }) {
  return (
    <GlassCard style={styles.stat}>
      <View accessible accessibilityLabel={`${label}: ${value}`}>
        <AppText variant="largeTitle" color={color} style={styles.digits}>
          {value}
        </AppText>
        <AppText variant="subheadline" color="secondaryLabel">
          {label}
        </AppText>
      </View>
    </GlassCard>
  );
}

function MonthNav({ month, onMove }: { month: Date; onMove: (delta: number) => void }) {
  const { colors } = useTheme();
  const arrow = (delta: number, label: string, ios: string, android: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onMove(delta)} style={styles.arrow}>
      <Icon ios={ios} android={android} size={18} color={colors.accent} />
    </Pressable>
  );
  return (
    <View style={styles.monthNav}>
      {arrow(-1, "Mês anterior", "chevron.left", "chevron_left")}
      <AppText variant="headline" accessibilityRole="header">
        {MONTHS[month.getMonth()]} {month.getFullYear()}
      </AppText>
      {arrow(1, "Próximo mês", "chevron.right", "chevron_right")}
    </View>
  );
}

export default function HistoryScreen() {
  const { data } = useAppState();
  const { colors } = useTheme();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const streak = currentStreak(data.completions, today, data.settings.days);
  const percent = weekPercent(data.completions, today, data.settings.days);
  const todayKey = dayKey(today);

  return (
    <Screen title="Histórico">
      <View style={styles.stats}>
        <Stat value={String(streak)} label={streak === 1 ? "dia seguido" : "dias seguidos"} color="warm" />
        <Stat value={`${percent}%`} label="desta semana" color="accentText" />
      </View>

      <GlassCard>
        <MonthNav month={month} onMove={(d) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1))} />
        <View style={styles.grid} importantForAccessibility="no">
          {HEAD.map((h, i) => (
            <AppText key={`h${i}`} variant="caption" color="secondaryLabel" align="center" style={styles.cell}>
              {h}
            </AppText>
          ))}
        </View>
        <View style={styles.grid}>
          {monthGrid(month).map((cell) => {
            const count = doneCount(data.completions, cell.key);
            const complete = count >= TRICK_COUNT;
            const isToday = cell.key === todayKey;
            const name = `${cell.date.getDate()} de ${MONTHS[cell.date.getMonth()].toLowerCase()}, ${WEEKDAY_NAMES[cell.date.getDay()]}`;
            return (
              <View
                key={cell.key}
                style={styles.cell}
                accessible={cell.inMonth}
                accessibilityLabel={`${name}: ${complete ? "completo" : `${count} de ${TRICK_COUNT}`}`}>
                {cell.inMonth && (
                  <View
                    style={[
                      styles.day,
                      complete && { backgroundColor: colors.success },
                      !complete && count > 0 && { backgroundColor: colors.successSoft },
                      isToday && { borderWidth: 2, borderColor: colors.accent },
                    ]}>
                    <AppText
                      variant="subheadline"
                      maxFontSizeMultiplier={1.3}
                      style={{ color: complete ? colors.onAccent : colors.label, fontWeight: isToday ? "700" : "400" }}>
                      {cell.date.getDate()}
                    </AppText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: colors.success }]} />
          <AppText variant="footnote" color="secondaryLabel">Dia completo</AppText>
          <View style={[styles.swatch, { backgroundColor: colors.successSoft }]} />
          <AppText variant="footnote" color="secondaryLabel">Parcial</AppText>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space.md },
  stat: { flex: 1 },
  digits: { fontVariant: ["tabular-nums"] },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  arrow: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  day: { width: "84%", aspectRatio: 1, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  swatch: { width: 12, height: 12, borderRadius: 6 },
});
