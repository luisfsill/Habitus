import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { sliceCenters } from "@/domain/schedule";
import { formatEvery, waterMinutes } from "@/domain/water";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { Block } from "./landing-sections";
import { css, SurfaceButton, useCountUp, useInView } from "./surface-parts";

// The simulator runs the app's own rule (waterMinutes) on the default 08:00–16:00 day, so what it shows is what the app does.
const START = 8 * 60;
const END = 16 * 60;
const TIPS = sliceCenters(START, END - START).map(Math.round);
const EVERY = [60, 90, 120] as const;
const GOAL = 8;
const at = (minutes: number) => `${((minutes - START) / (END - START)) * 100}%`;

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

const GLASS = "M24 8 H176 L156 252 Q155 262 145 262 H55 Q45 262 44 252 Z";
// One wave period is 200 wide; the path runs two periods so sliding it by one loops seamlessly.
const WAVE = "M0 12 Q50 0 100 12 T200 12 T300 12 T400 12 V400 H0 Z";

/** A tall glass that fills cup by cup, its surface waving; full, it turns green. */
function Glass({ cups }: { cups: number }) {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  const level = shown ? Math.min(cups, GOAL) / GOAL : 0;
  const done = cups >= GOAL;
  const tint = done ? colors.success : colors.accentText;
  return (
    <View ref={ref} style={styles.glass} accessible accessibilityLabel={`Copo com ${Math.min(cups, GOAL)} de ${GOAL} copos`}>
      <svg width={200} height={270} viewBox="0 0 200 270" aria-hidden>
        <defs>
          <clipPath id="glass-clip">
            <path d={GLASS} />
          </clipPath>
        </defs>
        <g clipPath="url(#glass-clip)">
          {/* 254 px of glass from the bottom: empty sits just under it, full a little over the rim. */}
          <g style={{ transform: `translateY(${262 - level * 262}px)`, transition: "transform 900ms cubic-bezier(.2,.9,.25,1)" }}>
            {[0.35, 0.8].map((opacity, i) => (
              <path key={i} d={WAVE} fill={tint} opacity={opacity} transform={`translate(${i * -60} ${i * 4})`}>
                {/* Backticks: the icon font test reads double-quoted lowercase words as icon names. */}
                <animateTransform attributeName={`transform`} type={`translate`} from={`${i * -60} ${i * 4}`} to={`${i * -60 - 200} ${i * 4}`} dur={`${2.6 + i}s`} repeatCount="indefinite" />
              </path>
            ))}
          </g>
        </g>
        <path d={GLASS} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinejoin="round" />
        <path d="M40 30 L56 230" stroke="rgba(255,255,255,0.18)" strokeWidth={6} strokeLinecap="round" />
      </svg>
      <View style={styles.glassLabel} pointerEvents="none">
        <AppText style={styles.glassCount}>
          {Math.min(cups, GOAL)}/{GOAL}
        </AppText>
        <AppText variant="headline" style={css({ textShadow: "0 1px 6px rgba(0,0,0,0.5)" })}>
          {done ? "Meta batida! +15 XP" : "copos"}
        </AppText>
      </View>
    </View>
  );
}

/** Pick an interval and watch the day's reminders move along the timeline. */
function Simulator() {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  const [every, setEvery] = useState<number>(90);
  const times = waterMinutes("08:00", "16:00", every, TIPS);
  const count = useCountUp(times.length, shown);
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
        Pontos brancos são as dicas: a água nunca chega junto.
      </AppText>

    </View>
  );
}

export function WaterSection({ wide }: { wide: boolean }) {
  const [cups, setCups] = useState(3);
  const done = cups >= GOAL;
  return (
    <Block id="agua" kicker="Lembrete de água" title="Beba água no ritmo do seu dia">
      <View style={[styles.split, wide && styles.splitWide]}>
        <View style={styles.glassSide}>
          <Glass cups={cups} />
          <SurfaceButton label={done ? "Esvaziar o copo" : "+1 copo"} size="md" variant="outline" onPress={() => setCups(done ? 0 : cups + 1)} />
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
  glassSide: { alignItems: "center", gap: space.lg },
  glass: { width: 200, height: 270 },
  glassLabel: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  glassCount: { fontSize: 56, lineHeight: 60, fontWeight: "800", letterSpacing: -2, color: "#FFFFFF", textShadow: "0 2px 10px rgba(0,0,0,0.45)" } as object,
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
});
