import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { StatColumns } from "@/components/stat-columns";
import { Icon } from "@/components/icon";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import type { AppData } from "@/domain/app-data";
import { currentStreak, doneCount, monthGrid, weekPercent } from "@/domain/history";
import { dayKey } from "@/domain/time";
import { TRICK_COUNT } from "@/domain/tricks";
import { HIT, space, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const HEAD = ["D", "S", "T", "Q", "Q", "S", "S"];

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

/** Streak, week percent and the month calendar. Lives inside the Conquistas tab. */
export function HistoryPanel({ data }: { data: AppData }) {
  const { colors } = useTheme();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const streak = currentStreak(data.completions, today, data.settings.days);
  const percent = weekPercent(data.completions, today, data.settings.days);
  const todayKey = dayKey(today);

  return (
    <>
      <StatColumns
        stats={[
          { value: String(streak), label: streak === 1 ? "dia seguido" : "dias seguidos", color: "warm" },
          { value: `${percent}%`, label: "desta semana", color: "accentText" },
        ]}
      />

      <View>
        <MonthNav month={month} onMove={(d) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1))} />
        <View style={styles.grid} importantForAccessibility="no">
          {HEAD.map((h, i) => (
            <AppText key={`h${i}`} variant="caption" color="secondaryLabel" align="center" style={styles.weekday}>
              {h}
            </AppText>
          ))}
        </View>
        <View style={[styles.grid, styles.bleed, { borderColor: colors.separator }]}>
          {monthGrid(month).map((cell) => {
            const count = doneCount(data.completions, cell.key);
            const complete = count >= TRICK_COUNT;
            const isToday = cell.key === todayKey;
            const name = `${cell.date.getDate()} de ${MONTHS[cell.date.getMonth()].toLowerCase()}, ${WEEKDAY_NAMES[cell.date.getDay()]}`;
            return (
              <View
                key={cell.key}
                style={[
                  styles.cell,
                  styles.line,
                  { borderColor: colors.separator },
                  complete && { backgroundColor: colors.successSoft },
                  isToday && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
                ]}
                accessible={cell.inMonth}
                accessibilityLabel={`${name}: ${complete ? "completo" : `${count} de ${TRICK_COUNT}`}`}>
                {cell.inMonth && (
                  <>
                    <AppText
                      variant="subheadline"
                      maxFontSizeMultiplier={1.3}
                      color={complete ? "successText" : isToday ? "accentText" : "label"}
                      style={(complete || isToday) && styles.bold}>
                      {cell.date.getDate()}
                    </AppText>
                    {!complete && count > 0 && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                  </>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: colors.successSoft }]} />
          <AppText variant="footnote" color="secondaryLabel">Dia completo</AppText>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <AppText variant="footnote" color="secondaryLabel">Parcial</AppText>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  arrow: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  // The month grid runs edge to edge, with hairlines between days.
  bleed: { marginHorizontal: -space.xl, borderTopWidth: StyleSheet.hairlineWidth },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  weekday: { width: `${100 / 7}%`, paddingVertical: space.sm },
  line: { borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  bold: { fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
