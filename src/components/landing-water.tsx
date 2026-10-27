import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { sliceCenters } from "@/domain/schedule";
import { formatEvery, waterMinutes } from "@/domain/water";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { Bullets, Block } from "./landing-sections";
import { css, SurfaceButton, useCountUp, useInView } from "./surface-parts";

// The simulator runs the app's own rule (waterMinutes) on the default 08:00–16:00 day, so what it shows is what the app does.
const START = 8 * 60;
const END = 16 * 60;
const TIPS = sliceCenters(START, END - START).map(Math.round);
const EVERY = [60, 90, 120] as const;
const GOAL = 8;
const at = (minutes: number) => `${((minutes - START) / (END - START)) * 100}%`;

const POINTS = [
  { icon: "water_drop", text: "Meta de 1 a 20 copos por dia. Quem decide é você." },
  { icon: "timer", text: "Avisos a cada 30 min até 4 h, só dentro do seu horário." },
  { icon: "notifications_off", text: "Bateu a meta? Os avisos param até o dia seguinte." },
  { icon: "emoji_events", text: "+15 XP em cada dia com a meta batida." },
] as const;

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={[styles.chip, selected ? styles.chipOn : styles.chipOff, css({ transition: "background-color 200ms, border-color 200ms" })]}>
        <AppText variant="subheadline" style={[styles.bold, { color: selected ? "#041526" : "#FFFFFF" }]}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Pick an interval and watch the day's reminders move along the timeline; then log cups up to the goal. */
function Simulator() {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  const [every, setEvery] = useState<number>(90);
  const [cups, setCups] = useState(5);
  const times = waterMinutes("08:00", "16:00", every, TIPS);
  const count = useCountUp(times.length, shown);
  const done = cups >= GOAL;
  return (
    <View ref={ref} style={[styles.sim, { borderColor: colors.separator }]}>
      <AppText variant="footnote" color="secondaryLabel" style={styles.kicker}>
        SIMULE SEU DIA · 08:00 ÀS 16:00
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Intervalo dos lembretes">
        {EVERY.map((m) => (
          <Chip key={m} label={`a cada ${formatEvery(m)}`} selected={every === m} onPress={() => setEvery(m)} />
        ))}
      </View>
      <View style={styles.countRow}>
        <AppText style={[styles.count, { color: colors.accentText }]}>{count}</AppText>
        <AppText variant="headline" color="secondaryLabel" style={styles.flex}>
          lembretes de água no dia
        </AppText>
      </View>

      <View style={styles.track} accessibilityLabel={`Lembretes às ${times.map((m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`).join(", ")}`}>
        <View style={[styles.line, { backgroundColor: colors.separator }]} />
        {TIPS.map((m) => (
          <View key={`tip-${m}`} style={[styles.tip, { left: at(m) }]} />
        ))}
        {times.map((m, i) => (
          <View
            key={i}
            style={[styles.drop, css({ left: at(m), opacity: shown ? 1 : 0, transition: `left 500ms cubic-bezier(.2,.9,.25,1), opacity 400ms ${i * 90}ms` })]}>
            <Icon ios="drop.fill" android="water_drop" size={22} color={colors.accentText} />
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        {["08:00", "12:00", "16:00"].map((t) => (
          <AppText key={t} variant="caption" color="secondaryLabel">
            {t}
          </AppText>
        ))}
      </View>
      <AppText variant="footnote" color="secondaryLabel">
        Pontos brancos são as dicas. Um aviso de água a menos de 10 min de uma dica é pulado.
      </AppText>

      <View style={[styles.cups, { borderColor: colors.separator }]}>
        <View style={styles.cupRow} accessibilityLabel={`${Math.min(cups, GOAL)} de ${GOAL} copos`}>
          {Array.from({ length: GOAL }, (_, i) => (
            <View key={i} style={css({ transform: `scale(${i < cups ? 1 : 0.8})`, transition: "transform 300ms cubic-bezier(.3,1.6,.5,1)" })}>
              <Icon ios="drop.fill" android="water_drop" size={26} color={i < cups ? colors.accentText : "rgba(238,247,255,0.18)"} />
            </View>
          ))}
        </View>
        <View style={styles.cupFoot}>
          <AppText variant="headline" style={done ? { color: colors.success } : undefined}>
            {done ? "Meta batida! +15 XP" : `${cups} de ${GOAL} copos`}
          </AppText>
          <SurfaceButton label={done ? "Recomeçar" : "+1 copo"} size="md" variant="outline" onPress={() => setCups(done ? 0 : cups + 1)} />
        </View>
      </View>
    </View>
  );
}

export function WaterSection({ wide }: { wide: boolean }) {
  return (
    <Block id="agua" kicker="Lembrete de água" title="Beba água no ritmo do seu dia">
      <View style={[styles.split, wide && styles.splitWide]}>
        <View style={[styles.text, wide && styles.textWide]}>
          <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
            Diga quantos copos quer beber e de quanto em quanto tempo quer ser lembrado. O Habitus avisa ao longo do dia e marca seu
            progresso com um toque.
          </AppText>
          <Bullets items={POINTS} />
          <AppText variant="footnote" color="secondaryLabel">
            Vem desligado: você liga em Ajustes quando quiser.
          </AppText>
        </View>
        <View style={wide ? styles.flex : undefined}>
          <Simulator />
        </View>
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  kicker: { fontWeight: "700", letterSpacing: 1 },
  split: { gap: space.xxl },
  splitWide: { flexDirection: "row", alignItems: "center", gap: space.xxl * 2 },
  text: { gap: space.xl },
  textWide: { width: 440 },
  lede: { fontWeight: "400", lineHeight: 30 },
  sim: { gap: space.lg, paddingVertical: space.xl, borderTopWidth: 1, borderBottomWidth: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { minHeight: 36, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: "center" },
  chipOn: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  chipOff: { borderColor: "rgba(255,255,255,0.35)" },
  countRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  count: { fontSize: 64, lineHeight: 68, fontWeight: "700", letterSpacing: -2, minWidth: 48 },
  track: { height: 40, marginHorizontal: 11, justifyContent: "center" },
  line: { height: 2, borderRadius: 1 },
  tip: { position: "absolute", width: 8, height: 8, marginLeft: -4, borderRadius: 4, backgroundColor: "#FFFFFF" },
  drop: { position: "absolute", top: -2, marginLeft: -11 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: -space.sm },
  cups: { gap: space.md, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  cupRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cupFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space.md },
});
