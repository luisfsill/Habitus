import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { space, ThemePreferenceContext, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { DayChart, StatsBand } from "./landing-day";
import { LandingMenu, MenuButton } from "./landing-menu";
import { RemindersSection } from "./landing-reminders";
import { Faq, Features, Footer, Plans, Steps, Tips } from "./landing-sections";
import { WaterSection } from "./landing-water";
import { PhoneMock } from "./phone-mock";
import { css, NavLink, Reveal, SurfaceButton } from "./surface-parts";
import { WaterBackdrop } from "./water-backdrop";

const PAGE_WIDTH = 1120;
const BAR_HEIGHT = 72;
const NAV = [
  { id: "agua", label: "Água" },
  { id: "lembretes", label: "Lembretes" },
  { id: "dicas", label: "As 6 dicas" },
  { id: "planos", label: "Planos" },
  { id: "duvidas", label: "Dúvidas" },
] as const;

interface Props {
  onStart: () => void;
  onSignIn: () => void;
  onLegal: (page: "terms" | "privacy") => void;
  /** A phone's browser, where the app runs installed: "Instalar app" takes the bar's main button. */
  onInstall?: () => void;
  /** Dialogs and bars laid over the page, under its dark theme. */
  children?: ReactNode;
}

function scrollTo(id: string) {
  if (id === TOP) window.scrollTo({ top: 0, behavior: "smooth" });
  else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TOP = "topo";
const MENU = [{ id: TOP, label: "Início" }, ...NAV];

interface NavProps {
  wide: boolean;
  onSignIn: () => void;
  onStart: () => void;
  onInstall?: () => void;
  menu: boolean;
  onMenu: () => void;
}

/** Fixed glass bar: sign in and start stay one click away anywhere on the page. */
function Nav({ wide, onSignIn, onStart, onInstall, menu, onMenu }: NavProps) {
  return (
    // Above the open menu, so the X that closes it stays on top.
    <View style={[styles.bar, BAR_GLASS, menu && styles.barOverMenu]}>
      <View style={[styles.nav, styles.page]}>
        <View style={styles.brand}>
          <Pressable onPress={() => scrollTo(TOP)} accessibilityRole="link" accessibilityLabel="Habitus, voltar ao início" style={styles.brandLink}>
            <Image source={{ uri: "/icon-192.png" }} style={styles.brandIcon} accessible={false} />
            <AppText variant="title3" style={styles.bold}>
              Habitus
            </AppText>
          </Pressable>
        </View>
        {wide && (
          <View style={styles.navLinks}>
            {NAV.map((item) => (
              <NavLink key={item.id} label={item.label} onPress={() => scrollTo(item.id)} />
            ))}
          </View>
        )}
        <View style={styles.actions}>
          {/* Narrow screens: only the menu; its sheet holds the sections and the buttons. */}
          {wide ? (
            <>
              <SurfaceButton label="Entrar" onPress={onSignIn} variant="outline" size="md" />
              {onInstall ? <SurfaceButton label="Instalar app" onPress={onInstall} size="md" /> : <SurfaceButton label="Começar grátis" onPress={onStart} size="md" />}
            </>
          ) : (
            <MenuButton open={menu} onPress={onMenu} />
          )}
        </View>
      </View>
    </View>
  );
}

function Hero({ wide, onStart }: { wide: boolean; onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, wide && styles.heroWide]}>
      <Animated.View entering={FadeInUp.duration(700)} style={[styles.heroText, wide && styles.heroTextWide]}>
        <AppText style={[styles.headline, !wide && styles.headlineNarrow]} accessibilityRole="header">
          Água, lembretes{"\n"}e pausas.{"\n"}
          <AppText style={[styles.headline, !wide && styles.headlineNarrow, { color: colors.accentText }]}>Na hora certa.</AppText>
        </AppText>
        <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
          O Habitus lembra você de beber água, dos seus compromissos e de seis pausas rápidas de bem-estar, ao longo do seu dia.
        </AppText>
        <View style={styles.heroActions}>
          <SurfaceButton label="Começar meus 7 dias grátis" onPress={onStart} />
          <NavLink label="Ver como funciona" onPress={() => scrollTo("como-funciona")} />
        </View>
        <AppText variant="footnote" color="secondaryLabel">
          7 dias grátis, sem cartão.
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(800)} style={REFLECT}>
        <PhoneMock />
      </Animated.View>
    </View>
  );
}

/**
 * Home for visitors ("Superfície"), on a computer and in a phone's browser (`InstallGate`): clean type and white buttons over live dark water that the mouse stirs.
 * Always the dark theme, whatever the system's, so the text reads on the water.
 */
export function LandingPage({ onStart, onSignIn, onLegal, onInstall, children }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const columns = width >= 960 ? 3 : width >= 640 ? 2 : 1;
  // Section links land below the fixed bar instead of under it.
  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = `${BAR_HEIGHT}px`;
    return () => void (document.documentElement.style.scrollPaddingTop = "");
  }, []);
  const [menu, setMenu] = useState(false);
  const pick = useCallback((id: string | null) => {
    setMenu(false);
    if (id) scrollTo(id);
  }, []);
  const fromMenu = (go: () => void) => () => {
    setMenu(false);
    go();
  };

  return (
    <ThemePreferenceContext.Provider value="dark">
      <View style={styles.root}>
        <WaterBackdrop scheme="dark" ripples />
        {!wide && (
          <LandingMenu
            open={menu}
            items={MENU}
            onPick={pick}
            main={onInstall ? { label: "Instalar app", onPress: fromMenu(onInstall) } : { label: "Começar grátis", onPress: fromMenu(onStart) }}
            onSignIn={fromMenu(onSignIn)}
          />
        )}
        <Nav wide={wide} onSignIn={onSignIn} onStart={onStart} onInstall={onInstall} menu={menu && !wide} onMenu={() => setMenu(!menu)} />
        <View style={[styles.page, styles.belowBar]}>
          <Hero wide={wide} onStart={onStart} />
          <Reveal>
            <StatsBand columns={width >= 760 ? 4 : 2} />
          </Reveal>
          <WaterSection wide={wide} />
          <RemindersSection wide={wide} />
          <Reveal>
            <DayChart wide={wide} />
          </Reveal>
          <Tips wide={wide} />
          <Reveal>
            <Steps columns={Math.min(columns, 3)} />
          </Reveal>
          <Reveal>
            <Features columns={columns} />
          </Reveal>
          <Reveal>
            <Plans wide={wide} onStart={onStart} />
          </Reveal>
          <Reveal>
            <Faq />
          </Reveal>
          <Reveal style={styles.final}>
            <AppText style={[styles.finalTitle, !wide && styles.headlineNarrow]}>Seu dia mais leve começa hoje.</AppText>
            <AppText variant="body" color="secondaryLabel" align="center">
              Crie sua conta em menos de um minuto e use água, lembretes e as 6 dicas por 7 dias, sem cartão.
            </AppText>
            <SurfaceButton label="Criar minha conta grátis" onPress={onStart} />
          </Reveal>
          <Footer onLegal={onLegal} />
        </View>
        {children}
      </View>
    </ThemePreferenceContext.Provider>
  );
}

const BAR_GLASS = css({
  position: "fixed",
  backgroundColor: "rgba(4,21,38,0.55)",
  backdropFilter: "blur(18px) saturate(1.6)",
  WebkitBackdropFilter: "blur(18px) saturate(1.6)",
  boxShadow: "inset 0 -1px 0 rgba(125,211,252,0.14), inset 0 1px 0 rgba(255,255,255,0.08)",
});

// The phone stands on the water: its reflection fades away below it (Chromium and Safari; others just skip it).
const REFLECT = css({ WebkitBoxReflect: "below 14px linear-gradient(transparent 62%, rgba(255,255,255,0.2))" });

const styles = StyleSheet.create({
  root: { minHeight: "100%" },
  bar: { top: 0, left: 0, right: 0, height: BAR_HEIGHT, justifyContent: "center", zIndex: 20 },
  barOverMenu: { zIndex: 30 },
  page: { width: "100%", maxWidth: PAGE_WIDTH, alignSelf: "center", paddingHorizontal: space.xl },
  belowBar: { paddingTop: BAR_HEIGHT },
  bold: { fontWeight: "700" },
  nav: { flexDirection: "row", alignItems: "center", gap: space.xl },
  // Brand and actions take equal sides, so the links sit in the middle of the bar.
  brand: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  brandLink: { flexDirection: "row", alignItems: "center", gap: space.sm },
  brandIcon: { width: 32, height: 32, borderRadius: 8 },
  navLinks: { flexDirection: "row", gap: space.xl },
  actions: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.md },
  hero: { gap: space.xxl, paddingTop: space.xxl * 2, paddingBottom: space.xxl * 4, alignItems: "center" },
  heroWide: { flexDirection: "row", justifyContent: "space-between" },
  heroText: { gap: space.lg + 4, alignItems: "flex-start" },
  heroTextWide: { flex: 1, maxWidth: 600 },
  headline: { fontSize: 68, lineHeight: 72, fontWeight: "800", letterSpacing: -2.5 },
  headlineNarrow: { fontSize: 44, lineHeight: 50 },
  lede: { fontWeight: "400", lineHeight: 30, maxWidth: 520 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: space.xl, flexWrap: "wrap", marginTop: space.sm },
  final: { alignItems: "center", gap: space.lg, paddingVertical: space.xxl * 4 },
  finalTitle: { fontSize: 52, lineHeight: 58, fontWeight: "800", letterSpacing: -2, textAlign: "center" },
});
