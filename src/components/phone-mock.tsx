import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { css, reducedMotion, useCountUp, useInView } from "./surface-parts";

// The secret stays a secret: the mock shows the day's shape, not what the tips are.
const ROWS = [
  { time: "08:48", state: "done", bar: 62 },
  { time: "10:24", state: "done", bar: 48 },
  { time: "12:00", state: "next", bar: 70 },
  { time: "13:36", state: "pending", bar: 54 },
  { time: "15:12", state: "pending", bar: 44 },
] as const;
const CUPS = 5;
const GOAL = 8;
const TABS = [
  { label: "Hoje", ios: "sun.max", android: "wb_sunny" },
  { label: "Conquistas", ios: "trophy", android: "emoji_events" },
  { label: "Conversas", ios: "bubble.left.and.bubble.right", android: "chat" },
  { label: "Perfil", ios: "person.crop.circle", android: "account_circle" },
  { label: "Ajustes", ios: "gearshape", android: "settings" },
] as const;
// Deep blue aluminium, like the latest Pro's.
const METAL = "linear-gradient(135deg, #3a4f6b 0%, #1c2a3d 30%, #4c6383 52%, #1a2738 75%, #34475f 100%)";

/** mm:ss counting down once a second from `from` seconds, like the next tip's countdown. */
function useCountdown(from: number): string {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : from)), 1000);
    return () => clearInterval(id);
  }, [from]);
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}

/** Tilts back and rises a little as the page scrolls away from the top. */
function useScrollTilt(): number {
  const [y, setY] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setY(Math.min(window.scrollY, 700)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, []);
  return y;
}

function StatusBar() {
  return (
    <View style={styles.status}>
      <AppText style={styles.clock}>9:41</AppText>
      <View style={styles.island} />
      <svg width={66} height={13} viewBox="0 0 66 13" aria-hidden>
        {[4, 6.5, 9, 11.5].map((h, i) => (
          <rect key={i} x={6 + i * 4.5} y={12 - h} width={3} height={h} rx={0.8} fill="#FFFFFF" />
        ))}
        <path d="M28 4.6a8.6 8.6 0 0 1 11.6 0M30.2 7a5.3 5.3 0 0 1 7.2 0M32.4 9.4a2 2 0 0 1 2.8 0" stroke="#FFFFFF" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <rect x={42.5} y={1.5} width={20} height={10} rx={3} stroke="rgba(255,255,255,0.45)" fill="none" />
        <rect x={44.3} y={3.3} width={13} height={6.4} rx={1.6} fill="#FFFFFF" />
        <rect x={63.6} y={4.8} width={1.6} height={3.6} rx={0.8} fill="rgba(255,255,255,0.45)" />
      </svg>
    </View>
  );
}

/** The account button: photo with the day's progress ring (2 of 6). */
function Avatar() {
  const { colors } = useTheme();
  const ring = 2 * Math.PI * 16;
  return (
    <View style={styles.avatar}>
      <svg width={38} height={38} viewBox="0 0 38 38" aria-hidden style={{ position: "absolute" }}>
        <circle cx={19} cy={19} r={16} stroke={colors.ringTrack} strokeWidth={3} fill="none" />
        <circle cx={19} cy={19} r={16} stroke={colors.accentText} strokeWidth={3} fill="none" strokeDasharray={`${ring / 3} ${ring}`} strokeLinecap="round" transform="rotate(-90 19 19)" />
      </svg>
      <AppText variant="footnote" color="accentText" style={styles.bold}>
        A
      </AppText>
    </View>
  );
}

function Water({ run }: { run: boolean }) {
  const { colors } = useTheme();
  const cups = useCountUp(CUPS, run, 1600);
  return (
    <View style={[styles.section, { borderColor: colors.separator }]}>
      <View style={styles.line}>
        <Icon ios="drop.fill" android="water_drop" size={15} color={colors.accentText} />
        <AppText style={[styles.small, styles.flex]} numberOfLines={1}>
          <AppText style={[styles.small, styles.bold]}>
            {cups}/{GOAL} copos
          </AppText>
          <AppText style={[styles.small, { color: colors.secondaryLabel }]}> · faltam {GOAL - cups}</AppText>
        </AppText>
        <View style={[styles.pill, { backgroundColor: colors.fill }]}>
          <AppText style={[styles.tiny, styles.bold]}>−1 🥛</AppText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <AppText style={[styles.tiny, styles.bold]}>+1 🥛</AppText>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View style={[styles.fill, { backgroundColor: colors.accent, width: `${(cups / GOAL) * 100}%` }]} />
      </View>
    </View>
  );
}

function Timeline({ run }: { run: boolean }) {
  const { colors } = useTheme();
  const countdown = useCountdown(42 * 60 + 10);
  return (
    <View style={[styles.section, { borderColor: colors.separator }]}>
      <AppText style={[styles.head, styles.bold]}>Linha do tempo</AppText>
      {ROWS.map((row, i) => {
        const next = row.state === "next";
        return (
          <View key={row.time} style={[styles.row, i > 0 && styles.divided, { borderColor: colors.separator }]}>
            <AppText style={[styles.small, styles.time, { color: next ? colors.accentText : colors.secondaryLabel }]}>{row.time}</AppText>
            <View style={styles.rowBody}>
              <AppText style={[styles.small, styles.bold, next && { color: colors.accentText }]}>Dica {i + 1}</AppText>
              <View style={[styles.bar, { width: `${row.bar}%`, backgroundColor: colors.fill }]} />
            </View>
            {row.state === "done" && (
              <View style={css({ transform: `scale(${run ? 1 : 0})`, transition: `transform 450ms cubic-bezier(.3,1.6,.5,1) ${700 + i * 350}ms` })}>
                <Icon ios="checkmark.circle.fill" android="check_circle" size={18} color={colors.success} />
              </View>
            )}
            {next && <AppText style={[styles.small, styles.bold, styles.digits, { color: colors.accentText }]}>{countdown}</AppText>}
            {row.state === "pending" && <Icon ios="chevron.right" android="chevron_right" size={13} color={colors.secondaryLabel} />}
          </View>
        );
      })}
    </View>
  );
}

/** The floating glass tab bar, Hoje lit. */
function TabBar() {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, css({ backdropFilter: "blur(14px) saturate(1.6)", WebkitBackdropFilter: "blur(14px) saturate(1.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.35)" })]}>
      {TABS.map((tab, i) => (
        <View key={tab.label} style={[styles.tab, i === 0 && { backgroundColor: colors.fill }]}>
          <Icon ios={tab.ios} android={tab.android} size={18} color={i === 0 ? colors.label : colors.secondaryLabel} />
          <AppText style={[styles.tabLabel, { color: i === 0 ? colors.label : colors.secondaryLabel }]}>{tab.label}</AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * A latest-generation iPhone running the Hoje screen: aluminium band with its buttons, Dynamic Island, status bar,
 * water filling up, the next tip counting down and the floating tab bar. The tips themselves stay hidden.
 */
export function PhoneMock() {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  const y = useScrollTilt();
  return (
    <View ref={ref} style={css({ transform: `perspective(1400px) translateY(${-y * 0.12}px) rotateX(${y * 0.012}deg) rotateY(${-6 + y * 0.012}deg)`, transformStyle: "preserve-3d" })}>
      {/* Left: Action button and volume; right: side button and Camera Control. */}
      {[
        { side: "left", top: 118, height: 30 },
        { side: "left", top: 172, height: 52 },
        { side: "left", top: 234, height: 52 },
        { side: "right", top: 190, height: 82 },
        { side: "right", top: 410, height: 46 },
      ].map((b) => (
        <View key={`${b.side}${b.top}`} style={[styles.button, { [b.side]: -3, top: b.top, height: b.height }, css({ backgroundImage: METAL })]} />
      ))}
      <View style={[styles.band, css({ backgroundImage: METAL, boxShadow: "0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)" })]}>
        <View style={styles.bezel}>
          <View style={[styles.screen, { backgroundColor: colors.background }, css({ backgroundImage: "radial-gradient(120% 60% at 50% 0%, #0b3354 0%, #041526 60%)" })]}>
            <StatusBar />
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <View style={styles.flex}>
                  <AppText style={[styles.small, { color: colors.secondaryLabel }]}>sexta, 30 de outubro</AppText>
                  <AppText style={styles.title}>Bom dia, Ana!</AppText>
                </View>
                <Avatar />
              </View>
              <View style={[styles.segments, { backgroundColor: colors.fill }]}>
                <View style={[styles.segment, { backgroundColor: colors.accent }]}>
                  <AppText style={[styles.tiny, styles.bold]}>Meu dia</AppText>
                </View>
                <View style={styles.segment}>
                  <AppText style={[styles.tiny, styles.bold, { color: colors.secondaryLabel }]}>Feed</AppText>
                  <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                </View>
              </View>
              <Water run={shown} />
              <View style={[styles.section, { borderColor: colors.separator }]}>
                <View style={styles.line}>
                  <AppText style={[styles.head, styles.bold, styles.flex]}>Lembretes</AppText>
                  <AppText style={[styles.tiny, { color: colors.accentText }]}>+ Novo   Ver todos</AppText>
                </View>
                <View style={styles.line}>
                  <View style={styles.time}>
                    <AppText style={[styles.small, styles.bold]}>18:30</AppText>
                    <AppText style={[styles.tiny, { color: colors.secondaryLabel }]}>Hoje</AppText>
                  </View>
                  <View style={styles.rowBody}>
                    <AppText style={styles.small}>Academia</AppText>
                    <AppText style={[styles.tiny, { color: colors.secondaryLabel }]}>Faltam 6 h 30 min</AppText>
                  </View>
                  <Icon ios="chevron.right" android="chevron_right" size={13} color={colors.secondaryLabel} />
                </View>
              </View>
              <Timeline run={shown} />
            </View>
            <TabBar />
            <View style={styles.homeBar} />
            {/* Glass glare across the screen. */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, css({ backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 38%)" })]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const W = 300;
const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  band: { width: W, height: W * 2.08, borderRadius: 54, padding: 3.5 },
  bezel: { flex: 1, borderRadius: 51, padding: 9, backgroundColor: "#020407" },
  screen: { flex: 1, borderRadius: 42, overflow: "hidden" },
  button: { position: "absolute", width: 4, borderRadius: 2 },
  status: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 26, paddingTop: 4 },
  clock: { width: 66, fontSize: 15, fontWeight: "600", color: "#FFFFFF", textAlign: "center" },
  island: { position: "absolute", top: 11, left: "50%", marginLeft: -46, width: 92, height: 27, borderRadius: 14, backgroundColor: "#000000" },
  content: { paddingHorizontal: 14, gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: "800", letterSpacing: -0.5, color: "#FFFFFF" },
  avatar: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  segments: { flexDirection: "row", height: 26, padding: 2, borderRadius: 8 },
  segment: { flex: 1, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  section: { gap: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  head: { fontSize: 13, color: "#FFFFFF" },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  small: { fontSize: 12, lineHeight: 16, color: "#FFFFFF" },
  tiny: { fontSize: 10, lineHeight: 13, color: "#FFFFFF" },
  digits: { fontVariant: ["tabular-nums"] },
  pill: { height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: "center" },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  time: { width: 38 },
  rowBody: { flex: 1, gap: 4 },
  bar: { height: 5, borderRadius: 3 },
  tabs: { position: "absolute", left: 10, right: 10, bottom: 22, height: 54, flexDirection: "row", alignItems: "center", padding: 4, borderRadius: 27, backgroundColor: "rgba(20,48,74,0.55)" },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 23 },
  tabLabel: { fontSize: 8.5, fontWeight: "600" },
  homeBar: { position: "absolute", bottom: 7, left: "50%", marginLeft: -54, width: 108, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.85)" },
});
