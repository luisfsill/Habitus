import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { backdrops, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export interface AccountMenuItem {
  label: string;
  icon: { ios: string; android: string };
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  name: string;
  email: string;
  /** Small tag under the e-mail in the open menu, e.g. "ADMINISTRADOR". */
  tag?: string;
  /** Menu items in order; a destructive one ("Sair") goes last, after a separator. */
  menu: AccountMenuItem[];
  /** Shows the light/dark switch at the top of the menu. */
  onTheme?: (theme: "light" | "dark") => void;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

/** Account button (initials, name, e-mail) that opens a menu of account actions. */
export function AccountMenu({ name, email, tag, menu, onTheme }: Props) {
  const { colors, scheme } = useTheme();
  const fill = backdrops[scheme];
  const [open, setOpen] = useState(false);
  const choose = (item: AccountMenuItem) => {
    setOpen(false);
    item.onPress();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`Conta de ${name}`}
        accessibilityState={{ expanded: open }}
        style={[styles.account, fill]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <AppText variant="footnote" style={styles.avatarText}>
            {initials(name)}
          </AppText>
        </View>
        <View style={styles.who}>
          <AppText variant="subheadline" numberOfLines={1} style={styles.bold}>
            {name}
          </AppText>
          <AppText variant="caption" color="secondaryLabel" numberOfLines={1}>
            {email}
          </AppText>
        </View>
        <Icon ios="chevron.down" android="expand_more" size={14} color={colors.secondaryLabel} />
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(100)}
          accessibilityRole="menu"
          style={[styles.menu, fill, { borderColor: colors.separator, shadowColor: colors.shadow }]}>
          <View style={styles.menuHead}>
            <AppText variant="subheadline" style={styles.bold}>
              {name}
            </AppText>
            <AppText variant="caption" color="secondaryLabel">
              {email}
            </AppText>
            {tag && (
              <View style={[styles.tag, { backgroundColor: colors.label }]}>
                <AppText variant="caption" style={{ color: colors.background, fontWeight: "800" }}>
                  {tag}
                </AppText>
              </View>
            )}
          </View>
          {onTheme && <ThemeToggle onChange={onTheme} />}
          {menu.map((item) => (
            <View key={item.label}>
              {item.destructive && <View style={[styles.sep, { backgroundColor: colors.separator }]} />}
              <Pressable onPress={() => choose(item)} accessibilityRole="menuitem" style={styles.item}>
                <Icon ios={item.icon.ios} android={item.icon.android} size={20} color={item.destructive ? colors.danger : colors.secondaryLabel} />
                <AppText variant="body" color={item.destructive ? "danger" : "label"} style={item.destructive && styles.bold}>
                  {item.label}
                </AppText>
              </Pressable>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },
  account: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: space.md, borderRadius: radius.md },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontWeight: "800" },
  who: { maxWidth: 180 },
  bold: { fontWeight: "700" },
  menu: {
    position: "absolute",
    right: 0,
    top: 54,
    // Hugs its widest row (usually the e-mail) instead of a fixed width.
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 6,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHead: { padding: space.md, gap: 2 },
  tag: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, marginTop: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.sm },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 4 },
});
