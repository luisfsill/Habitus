import { Image, StyleSheet, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";

import type { Palette } from "@/theme";

import type { Row } from "./install-scenes";
import { BarIcon, Hot, LOGO, Rows, T } from "./install-phone-parts";

/** Safari on iOS 26, drawn small: the floating bottom bar, the share sheet and "Adicionar à Tela de Início". */

/** Back button, the address pill (≡ menu, site, reload) and the tabs button, floating over the page. */
export function SafariBar({ hot, colors }: { hot: boolean; colors: Palette }) {
  const glass = { backgroundColor: colors.surface, borderColor: colors.separator };
  return (
    <View style={styles.bar}>
      <View style={[styles.round, glass]}>
        <BarIcon name="chevron_left" color={colors.secondaryLabel} />
      </View>
      <View style={[styles.pill, glass]}>
        <Hot on={hot}>
          <BarIcon name="menu" color={colors.label} />
        </Hot>
        <T color={colors.label}>habitus.app</T>
        <BarIcon name="refresh" color={colors.label} size={11} />
      </View>
      <View style={[styles.round, glass]}>
        <BarIcon name="filter_none" color={colors.label} size={11} />
      </View>
    </View>
  );
}

// AirDrop, Mensagens, E-mail, Lembretes.
const APPS = ["#1E88FF", "#34C759", "#0A84FF", "#F2F2F7"];

function Action({ icon, label, hot, colors }: { icon: string; label: string; hot?: boolean; colors: Palette }) {
  return (
    <View style={styles.action}>
      <Hot on={!!hot} style={[styles.circle, { backgroundColor: hot ? colors.accentSoft : colors.fill }]}>
        <BarIcon name={icon} color={hot ? colors.accent : colors.label} size={12} />
      </Hot>
      <T size={6} color={hot ? colors.accentText : colors.label} bold={hot}>
        {label}
      </T>
    </View>
  );
}

/** The share sheet. Without rows: half height, "Ver Mais" is hot. With rows: opened all the way, the list below. */
export function SafariShare({ rows, colors }: { rows?: Row[]; colors: Palette }) {
  const open = !!rows;
  return (
    <Animated.View
      key={open ? "open" : "half"}
      entering={SlideInDown.duration(350)}
      style={[styles.share, open && styles.shareOpen, { backgroundColor: colors.surface }]}>
      <View style={styles.head}>
        <Image source={LOGO} style={styles.small} accessible={false} />
        <View style={styles.grow}>
          <T bold color={colors.label}>
            Habitus
          </T>
          <T size={7} color={colors.secondaryLabel}>
            habitus.app
          </T>
        </View>
        {open && <BarIcon name="close" color={colors.label} size={11} />}
      </View>
      <View style={styles.apps}>
        {APPS.map((c) => (
          <View key={c} style={[styles.app, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={styles.actions}>
        <Action icon="content_copy" label="Copiar" colors={colors} />
        <Action icon="bookmark_border" label="Favoritos" colors={colors} />
        <Action icon="eyeglasses" label="Leitura" colors={colors} />
        <Action icon={open ? "expand_less" : "expand_more"} label={open ? "Ver Menos" : "Ver Mais"} hot={!open} colors={colors} />
      </View>
      {rows && (
        <View style={[styles.group, { backgroundColor: colors.fill }]}>
          <Rows rows={rows} colors={colors} />
        </View>
      )}
    </Animated.View>
  );
}

/** "Adicionar à Tela de Início": close, title, the blue Adicionar button, the icon and name, "Abrir como app web" on. */
export function SafariAdd({ colors }: { colors: Palette }) {
  return (
    <Animated.View entering={SlideInDown.duration(350)} style={[styles.add, { backgroundColor: colors.surface }]}>
      <View style={styles.nav}>
        <View style={[styles.round, { backgroundColor: colors.fill, borderColor: "transparent" }]}>
          <BarIcon name="close" color={colors.label} size={11} />
        </View>
        <View style={styles.grow}>
          <T size={7} bold color={colors.label}>
            Adicionar à Tela de Início
          </T>
        </View>
        <Hot on style={[styles.addButton, { backgroundColor: colors.accent }]}>
          <T size={7} bold color={colors.onAccent}>
            Adicionar
          </T>
        </Hot>
      </View>
      <View style={[styles.card, { backgroundColor: colors.fill }]}>
        <Image source={LOGO} style={styles.small} accessible={false} />
        <View style={styles.grow}>
          <T bold color={colors.label}>
            Habitus
          </T>
          <T size={7} color={colors.secondaryLabel}>
            https://habitus.app/
          </T>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.fill }]}>
        <View style={styles.grow}>
          <T size={7} color={colors.label}>
            Abrir como app web
          </T>
        </View>
        <View style={styles.switch}>
          <View style={styles.knob} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  bar: { position: "absolute", left: 6, right: 6, bottom: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  round: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  pill: {
    flex: 1,
    height: 22,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  share: { position: "absolute", left: 3, right: 3, bottom: 3, borderRadius: 16, padding: 8, gap: 8 },
  shareOpen: { top: 22, bottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  small: { width: 22, height: 22, borderRadius: 5 },
  apps: { flexDirection: "row", justifyContent: "space-around" },
  app: { width: 20, height: 20, borderRadius: 5 },
  actions: { flexDirection: "row", justifyContent: "space-around" },
  action: { alignItems: "center", gap: 2, width: "25%" },
  circle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  group: { borderRadius: 8, paddingVertical: 2 },
  add: { position: "absolute", left: 0, right: 0, top: 22, bottom: 0, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 8, gap: 8 },
  nav: { flexDirection: "row", alignItems: "center", gap: 4 },
  addButton: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9 },
  card: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6, borderRadius: 8 },
  switch: { width: 20, height: 12, borderRadius: 6, backgroundColor: "#34C759", alignItems: "flex-end", padding: 1 },
  knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
});
