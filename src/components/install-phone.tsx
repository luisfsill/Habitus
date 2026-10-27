import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { type Palette, useTheme } from "@/theme";

import { BarIcon, Hot, LOGO, Rows, T } from "./install-phone-parts";
import { SafariAdd, SafariBar, SafariShare } from "./install-safari";
import type { Bar, Overlay, Scene } from "./install-scenes";

const DIM = "rgba(0,0,0,0.3)";

/** Chrome's or an in-app browser's top bar, with the menu button at the right. */
function TopBar({ bar, hot, colors }: { bar: Bar; hot: boolean; colors: Palette }) {
  const inapp = bar === "inapp";
  return (
    <View style={[styles.top, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
      <BarIcon name={inapp ? "close" : "home"} color={colors.label} />
      <View style={[styles.pill, styles.grow, !inapp && { backgroundColor: colors.fill }]}>
        <T color={colors.label} bold={inapp}>
          habitus.app
        </T>
      </View>
      <Hot on={hot}>
        <BarIcon name={inapp ? "more_horiz" : "more_vert"} color={colors.label} />
      </Hot>
    </View>
  );
}

function Page({ hot, colors }: { hot: boolean; colors: Palette }) {
  const line = (width: `${number}%`) => <View style={[styles.line, { width, backgroundColor: colors.fill }]} />;
  return (
    <View style={styles.page}>
      <Image source={LOGO} style={styles.logo} accessible={false} />
      <T size={12} bold color={colors.label}>
        Habitus
      </T>
      {line("90%")}
      {line("70%")}
      <Hot on={hot} style={[styles.cta, { backgroundColor: colors.accent }]}>
        <T bold color={colors.onAccent}>
          Instalar agora
        </T>
      </Hot>
      {line("80%")}
      {line("60%")}
    </View>
  );
}

function OverlayView({ overlay, bar, colors }: { overlay: Overlay; bar: Bar; colors: Palette }) {
  switch (overlay.kind) {
    case "share":
      return <SafariShare rows={overlay.rows} colors={colors} />;
    case "menu":
      return (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.menu, bar === "safari" ? styles.safariMenu : styles.topMenu, { backgroundColor: colors.surface }]}>
          <Rows rows={overlay.rows} colors={colors} />
        </Animated.View>
      );
    case "add":
      return <SafariAdd colors={colors} />;
    case "install":
      return (
        <Animated.View entering={ZoomIn.duration(300)} style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Image source={LOGO} style={styles.small} accessible={false} />
          <T size={10} bold color={colors.label}>
            Instalar app?
          </T>
          <T size={7} color={colors.secondaryLabel}>
            Habitus · habitus.app
          </T>
          <View style={styles.buttons}>
            <T color={colors.accentText}>Cancelar</T>
            <Hot on>
              <T bold color={colors.accentText}>
                Instalar
              </T>
            </Hot>
          </View>
        </Animated.View>
      );
    case "home":
      return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.home}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={styles.icon} />
          ))}
          <Animated.View entering={ZoomIn.delay(300).springify().damping(9)} style={styles.mine}>
            <Image source={LOGO} style={styles.homeLogo} accessible={false} />
            <T size={7} bold color="#FFFFFF">
              Habitus
            </T>
          </Animated.View>
        </Animated.View>
      );
  }
}

interface Props {
  bar: Bar;
  scene: Scene;
  /** Phone height; the width follows a phone's proportions. */
  height: number;
  onPress: () => void;
}

/** A drawn phone showing the browser at one install step, with the spot to tap highlighted. Decorative. */
export function InstallPhone({ bar: kindBar, scene, height, onPress }: Props) {
  const { colors } = useTheme();
  const bar = scene.bar ?? kindBar;
  const dims = scene.overlay && scene.overlay.kind !== "add" && scene.overlay.kind !== "home";
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Mostrar o próximo passo" style={[styles.phone, { height, width: height * 0.57 }]}>
      <View style={[styles.screen, { backgroundColor: colors.background }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.status}>
          <T bold color={colors.label}>
            9:41
          </T>
        </View>
        <View style={styles.island} />
        {bar !== "safari" && <TopBar bar={bar} hot={scene.hot === "more"} colors={colors} />}
        <Page hot={scene.hot === "install"} colors={colors} />
        {bar === "safari" && <SafariBar hot={scene.hot === "more"} colors={colors} />}
        {dims && <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />}
        {scene.overlay && <OverlayView overlay={scene.overlay} bar={bar} colors={colors} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  phone: { alignSelf: "center", padding: 6, borderRadius: 32, backgroundColor: "#111114" },
  screen: { flex: 1, borderRadius: 26, overflow: "hidden" },
  status: { height: 22, justifyContent: "center", paddingLeft: 18 },
  island: { position: "absolute", top: 6, alignSelf: "center", width: 44, height: 12, borderRadius: 6, backgroundColor: "#000" },
  grow: { flex: 1 },
  pill: { height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  page: { flex: 1, alignItems: "center", gap: 6, padding: 12 },
  logo: { width: 34, height: 34, borderRadius: 8, marginTop: 4 },
  line: { height: 6, borderRadius: 3 },
  cta: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9, marginVertical: 2 },
  small: { width: 22, height: 22, borderRadius: 5 },
  menu: { position: "absolute", borderRadius: 8, paddingVertical: 3, elevation: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.25)" },
  topMenu: { top: 44, right: 6, width: 124 },
  // Safari's menu pops up from the address bar, above it.
  safariMenu: { left: 14, right: 14, bottom: 38, borderRadius: 14 },
  dialog: { position: "absolute", top: "30%", left: 14, right: 14, borderRadius: 12, padding: 10, gap: 4, alignItems: "center" },
  buttons: { flexDirection: "row", alignSelf: "stretch", justifyContent: "flex-end", gap: 14, marginTop: 6 },
  home: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#3B5AA6", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", padding: 14, paddingTop: 30, gap: 12 },
  icon: { width: 26, height: 26, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.3)" },
  mine: { alignItems: "center", gap: 2 },
  homeLogo: { width: 26, height: 26, borderRadius: 7 },
});
