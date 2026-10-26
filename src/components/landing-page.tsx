import { Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { backdrops, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { Benefits, Faq, Features, Footer, Plans, Steps } from "./landing-sections";
import { PrimaryButton } from "./primary-button";

const PAGE_WIDTH = 1120;
const NAV = [
  { id: "beneficios", label: "Benefícios" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "planos", label: "Planos" },
  { id: "duvidas", label: "Dúvidas" },
] as const;

// The secret stays a secret: the mock shows the day's shape, not what the tips are.
const MOCK_ROWS = [
  { time: "08:48", state: "done" },
  { time: "10:24", state: "done" },
  { time: "12:00", state: "next" },
  { time: "13:36", state: "locked" },
  { time: "15:12", state: "locked" },
  { time: "23:00", state: "locked" },
] as const;

interface Props {
  onStart: () => void;
  onSignIn: () => void;
  onLegal: (page: "terms" | "privacy") => void;
}

function scrollTo(id: string) {
  if (Platform.OS === "web") document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Nav({ onStart, onSignIn, wide }: Pick<Props, "onStart" | "onSignIn"> & { wide: boolean }) {
  return (
    <View style={styles.nav}>
      <View style={styles.brand}>
        <Image source={{ uri: "/icon-192.png" }} style={styles.brandIcon} accessible={false} />
        <AppText variant="title3" style={styles.bold}>
          Habitus
        </AppText>
      </View>
      {wide && (
        <View style={styles.navLinks}>
          {NAV.map((item) => (
            <Pressable key={item.id} onPress={() => scrollTo(item.id)} accessibilityRole="button">
              <AppText variant="subheadline" color="secondaryLabel" style={styles.medium}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.navActions}>
        <Pressable onPress={onSignIn} accessibilityRole="button" style={styles.signIn}>
          <AppText variant="subheadline" style={styles.bold}>
            Entrar
          </AppText>
        </Pressable>
        <PrimaryButton label="Começar grátis" onPress={onStart} />
      </View>
    </View>
  );
}

/** A phone showing the Hoje screen, with the tips themselves hidden. */
function PhoneMock() {
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
    </View>
  );
}

function Hero({ onStart, wide }: { onStart: () => void; wide: boolean }) {
  return (
    <View style={[styles.hero, wide && styles.heroWide]}>
      <Animated.View entering={FadeInUp.duration(500)} style={[styles.heroText, wide && styles.heroTextWide]}>
        <View style={styles.pill}>
          <AppText variant="footnote" color="accentText" style={styles.bold}>
            7 dias grátis · sem cartão
          </AppText>
        </View>
        <AppText style={[styles.headline, !wide && styles.headlineNarrow]} accessibilityRole="header">
          Seis dicas por dia.{"\n"}Uma rotina mais leve.
        </AppText>
        <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
          O Habitus lembra você de pausas rápidas ao longo do dia, cada uma com até 2 minutos. Quais são? Você descobre ao entrar.
        </AppText>
        <View style={styles.heroActions}>
          <PrimaryButton label="Começar meus 7 dias grátis" onPress={onStart} glow />
          <Pressable onPress={() => scrollTo("como-funciona")} accessibilityRole="button" style={styles.secondary}>
            <AppText variant="headline" color="accentText">
              Ver como funciona
            </AppText>
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150).duration(600)}>
        <PhoneMock />
      </Animated.View>
    </View>
  );
}

/** Desktop home for visitors: what Habitus is, what it gives, how it works, the plans and the FAQ. */
export function LandingPage({ onStart, onSignIn, onLegal }: Props) {
  const { scheme } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const columns = width >= 960 ? 3 : width >= 640 ? 2 : 1;

  return (
    <ScrollView style={backdrops[scheme]} contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <Nav onStart={onStart} onSignIn={onSignIn} wide={wide} />
        <Hero onStart={onStart} wide={wide} />
        <Benefits columns={columns} />
        <Steps columns={Math.min(columns, 3)} />
        <Features columns={columns} />
        <Plans columns={Math.min(columns, 3)} onStart={onStart} />
        <Faq />
        <View style={styles.final}>
          <AppText variant="title1" align="center">
            Seu dia mais leve começa hoje.
          </AppText>
          <AppText variant="body" color="secondaryLabel" align="center">
            Crie sua conta em menos de um minuto e use tudo por 7 dias, sem cartão.
          </AppText>
          <View style={styles.cta}>
            <PrimaryButton label="Criar minha conta grátis" onPress={onStart} glow />
          </View>
        </View>
        <Footer onLegal={onLegal} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl },
  page: { width: "100%", maxWidth: PAGE_WIDTH, alignSelf: "center" },
  bold: { fontWeight: "700" },
  medium: { fontWeight: "500" },
  nav: { flexDirection: "row", alignItems: "center", gap: space.xl, paddingVertical: space.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  brandIcon: { width: 32, height: 32, borderRadius: 8 },
  navLinks: { flexDirection: "row", gap: space.xl, marginLeft: space.lg },
  navActions: { flexDirection: "row", alignItems: "center", gap: space.lg, marginLeft: "auto" },
  signIn: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  hero: { gap: space.xxl, paddingVertical: space.xxl * 2, alignItems: "center" },
  heroWide: { flexDirection: "row", justifyContent: "space-between" },
  heroText: { gap: space.lg, alignItems: "flex-start" },
  heroTextWide: { flex: 1, maxWidth: 560 },
  pill: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(61,123,255,0.35)" },
  headline: { fontSize: 60, lineHeight: 66, fontWeight: "800", letterSpacing: -2 },
  headlineNarrow: { fontSize: 42, lineHeight: 48 },
  lede: { fontWeight: "400", lineHeight: 30 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: space.lg, flexWrap: "wrap", marginTop: space.sm },
  secondary: { paddingVertical: space.sm },
  phone: { width: 320, borderRadius: 44, borderWidth: 8, padding: space.lg, paddingTop: space.xl, gap: space.sm },
  mockText: { color: "#F5F5F7" },
  mockMuted: { color: "#A1A1AA" },
  mockAccent: { color: "#8FB3FF" },
  mockStats: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)", marginVertical: space.sm },
  mockStat: { flex: 1, alignItems: "center", paddingVertical: space.sm },
  mockDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)" },
  mockRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  mockRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(148,163,184,0.3)" },
  mockTitle: { flex: 1, gap: 4 },
  mockBar: { height: 6, borderRadius: 3, backgroundColor: "rgba(148,163,184,0.25)" },
  final: { alignItems: "center", gap: space.md, paddingVertical: space.xxl * 2 },
  cta: { alignSelf: "center", minWidth: 320 },
});
