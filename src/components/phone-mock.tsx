import { StyleSheet, View } from "react-native";

import { backdrops, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

// The secret stays a secret: the mock shows the day's shape, not what the tips are.
const MOCK_ROWS = [
  { time: "08:48", state: "done" },
  { time: "10:24", state: "done" },
  { time: "12:00", state: "next" },
  { time: "13:36", state: "locked" },
] as const;
const WATER = "#7DD3FC";
const CUPS = 5;
const GOAL = 8;

/** A phone showing the Hoje screen, with the tips themselves hidden. */
export function PhoneMock() {
  const { colors } = useTheme();
  return (
    <View style={[styles.phone, { borderColor: colors.separator, boxShadow: "0 30px 80px rgba(2, 6, 23, 0.45)" }, backdrops.dark]}>
      <AppText variant="caption" style={styles.mockMuted}>
        segunda, 26 de outubro
      </AppText>
      <AppText variant="title2" style={styles.mockText}>
        Bom dia, Ana!
      </AppText>
      <View style={styles.mockStats}>
        {[
          ["2/6", "hoje"],
          ["12", "dias seguidos"],
          ["4", "nível"],
        ].map(([value, label], i) => (
          <View key={label} style={[styles.mockStat, i < 2 && styles.mockDivider]}>
            <AppText variant="headline" style={[styles.mockText, i === 1 && { color: "#FBBF24" }]}>
              {value}
            </AppText>
            <AppText variant="caption" style={styles.mockMuted}>
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" style={[styles.mockMuted, styles.bold]}>
        LINHA DO TEMPO
      </AppText>
      {MOCK_ROWS.map((row, i) => (
        <View key={row.time} style={[styles.mockRow, i > 0 && styles.mockRowLine]}>
          <AppText variant="footnote" style={row.state === "next" ? styles.mockAccent : styles.mockMuted}>
            {row.time}
          </AppText>
          <View style={styles.mockTitle}>
            <AppText variant="subheadline" style={[row.state === "next" ? styles.mockAccent : styles.mockText, styles.bold]}>
              Dica {i + 1}
            </AppText>
            <View style={[styles.mockBar, { width: `${50 + ((i * 17) % 35)}%` }]} />
          </View>
          {row.state === "done" && <Icon ios="checkmark.circle.fill" android="check_circle" size={18} color="#34D399" />}
          {row.state === "next" && (
            <AppText variant="footnote" style={[styles.mockAccent, styles.bold]}>
              42:10
            </AppText>
          )}
          {row.state === "locked" && <Icon ios="lock" android="lock" size={14} color="#64748B" />}
        </View>
      ))}
      <View style={styles.mockCard}>
        <View style={styles.mockLine}>
          <Icon ios="drop.fill" android="water_drop" size={16} color={WATER} />
          <AppText variant="subheadline" style={[styles.mockText, styles.bold, styles.mockTitle]}>
            Água
          </AppText>
          <AppText variant="footnote" style={styles.mockMuted}>
            {CUPS} de {GOAL} copos
          </AppText>
        </View>
        <View style={styles.mockTrack}>
          <View style={[styles.mockFill, { width: `${(CUPS / GOAL) * 100}%` }]} />
        </View>
      </View>
      <View style={[styles.mockCard, styles.mockLine]}>
        <Icon ios="bell" android="notifications_active" size={16} color="#FBBF24" />
        <View style={styles.mockTitle}>
          <AppText variant="subheadline" style={[styles.mockText, styles.bold]}>
            Academia
          </AppText>
          <AppText variant="caption" style={styles.mockMuted}>
            hoje, 18:30 · toda semana
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  phone: { width: 320, borderRadius: 44, borderWidth: 8, padding: space.lg, paddingTop: space.xl, gap: space.sm },
  mockText: { color: "#F5F5F7" },
  mockMuted: { color: "#A1A1AA" },
  mockAccent: { color: WATER },
  mockStats: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)", marginVertical: space.sm },
  mockStat: { flex: 1, alignItems: "center", paddingVertical: space.sm },
  mockDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)" },
  mockRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  mockRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)" },
  mockTitle: { flex: 1, gap: 4 },
  mockCard: { marginTop: space.xs, padding: space.md, gap: space.sm, borderRadius: 16, backgroundColor: "rgba(125,211,252,0.08)" },
  mockLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
  mockTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(125,211,252,0.18)", overflow: "hidden" },
  mockFill: { height: 6, borderRadius: 3, backgroundColor: WATER },
  mockBar: { height: 6, borderRadius: 3, backgroundColor: "rgba(148,163,184,0.25)" },
});
