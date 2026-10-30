import { StyleSheet, View } from "react-native";

import { sliceCenters } from "@/domain/schedule";
import { waterMinutes } from "@/domain/water";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Block } from "./landing-sections";
import { css, useInView } from "./surface-parts";

// A sample day, 07:00 to midnight: the default tip times, water every 1h30 by the app's own rule, three of the person's own reminders.
const FROM = 7 * 60;
const TO = 24 * 60;
const TIPS = [...sliceCenters(8 * 60, 8 * 60).map(Math.round), 23 * 60];
const WATER = waterMinutes("08:00", "16:00", 90, TIPS);
const OWN = [
  { at: 9 * 60 + 30, label: "Reunião" },
  { at: 18 * 60 + 30, label: "Academia" },
  { at: 20 * 60, label: "Ligar para a mãe" },
];
const pos = (m: number) => `${((m - FROM) / (TO - FROM)) * 100}%`;

/** One lane of the day: a label, a track, dots popping in one after another. */
function Lane({ name, color, times, labels, shown, wide }: { name: string; color: string; times: number[]; labels?: string[]; shown: boolean; wide: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={wide ? styles.lane : styles.laneNarrow}>
      <AppText variant="subheadline" style={[wide ? styles.laneName : styles.bold, { color }]}>
        {name}
      </AppText>
      <View style={styles.laneTrack}>
        <View style={[styles.rail, { backgroundColor: colors.separator }]} />
        {times.map((m, i) => (
          <View
            key={m}
            style={[
              styles.dot,
              { left: pos(m), backgroundColor: color },
              css({ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 0.2})`, transition: `opacity 400ms ${300 + i * 120}ms, transform 500ms cubic-bezier(.3,1.6,.5,1) ${300 + i * 120}ms` }),
            ]}>
            {labels?.[i] && (
              <AppText variant="caption" style={[styles.dotLabel, { color }, css({ whiteSpace: "nowrap" })]}>
                {labels[i]}
              </AppText>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function DayChart({ wide }: { wide: boolean }) {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  return (
    <Block id="seu-dia" kicker="Um dia com o Habitus" title="Tudo no seu dia, sem chegar junto">
      <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
        O Habitus espaça os avisos para não chegar tudo junto.
      </AppText>
      <View ref={ref} style={[styles.chart, { borderColor: colors.separator }]} accessibilityLabel="Exemplo de dia: 6 dicas, 5 lembretes de água e 3 lembretes pessoais">
        <Lane name="Dicas" color="#FFFFFF" times={TIPS} shown={shown} wide={wide} />
        <Lane name="Água" color={colors.accentText} times={WATER} shown={shown} wide={wide} />
        <Lane name="Seus lembretes" color={colors.warm} times={OWN.map((o) => o.at)} labels={wide ? OWN.map((o) => o.label) : undefined} shown={shown} wide={wide} />
        <View style={styles.hours}>
          {wide && <View style={styles.laneName} />}
          <View style={styles.laneTrack}>
            {[8, 12, 16, 20, 24].map((h) => (
              <AppText key={h} variant="caption" color="secondaryLabel" style={[styles.hour, { left: pos(h * 60) }]}>
                {h === 24 ? "0h" : `${h}h`}
              </AppText>
            ))}
          </View>
        </View>
        {/* The "now" line sweeps from morning to midday once. */}
        <View style={styles.nowArea} pointerEvents="none">
          {wide && <View style={styles.laneName} />}
          <View style={styles.flex}>
            <View style={[styles.now, css({ left: shown ? pos(13 * 60) : "0%", opacity: shown ? 1 : 0, transition: "left 2400ms cubic-bezier(.4,0,.2,1), opacity 300ms" })]} />
          </View>
        </View>
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lede: { fontWeight: "400", lineHeight: 30, maxWidth: 720 },
  chart: { gap: space.lg, paddingVertical: space.xl, borderTopWidth: 1, borderBottomWidth: 1 },
  lane: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  laneNarrow: { gap: space.sm, paddingBottom: space.xs },
  laneName: { width: 132, fontWeight: "700" },
  bold: { fontWeight: "700" },
  laneTrack: { flex: 1, height: 20, justifyContent: "center", marginRight: space.lg },
  rail: { height: 2, borderRadius: 1 },
  dot: { position: "absolute", width: 14, height: 14, marginLeft: -7, borderRadius: 7 },
  dotLabel: { position: "absolute", bottom: 18, left: -40, width: 94, textAlign: "center", fontWeight: "600" },
  hours: { flexDirection: "row", height: 16 },
  hour: { position: "absolute", width: 40, marginLeft: -20, textAlign: "center" },
  nowArea: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", marginRight: space.lg },
  now: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: "rgba(255,255,255,0.35)" },
});
