import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

export type AdminSection = "users" | "plans";

export interface AccountMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  section: AdminSection;
  onSection: (section: AdminSection) => void;
  name: string;
  email: string;
  /** Menu items in order; a destructive one ("Sair") goes last, after a separator. */
  menu: AccountMenuItem[];
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

/** Desktop/tablet header of the admin panel: sections on the left, the admin's account menu on the right. */
export function AdminTopBar({ section, onSection, name, email, menu }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const choose = (item: AccountMenuItem) => {
    setOpen(false);
    item.onPress();
  };

  return (
    <View style={[styles.bar, { borderColor: colors.separator }]}>
      <AppText variant="headline" style={styles.brand}>
        <AppText variant="headline" color="accent" style={styles.brand}>
          Habitus
        </AppText>{" "}
        Admin
      </AppText>
      <View style={styles.sections}>
        {(["users", "plans"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => onSection(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s }}
            style={[styles.section, section === s && { backgroundColor: colors.accentSoft }]}>
            <AppText variant="subheadline" color={section === s ? "accentText" : "secondaryLabel"} style={{ fontWeight: "600" }}>
              {s === "users" ? "Usuários" : "Planos e preços"}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.accountWrap}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel={`Conta de ${name}`}
          accessibilityState={{ expanded: open }}
          style={[styles.account, { backgroundColor: colors.surface, borderColor: colors.accentSoft }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <AppText variant="footnote" style={styles.avatarText}>
              {initials(name)}
            </AppText>
          </View>
          <View>
            <AppText variant="subheadline" style={{ fontWeight: "700" }}>
              {name}
            </AppText>
            <AppText variant="caption" color="secondaryLabel">
              {email}
            </AppText>
          </View>
          <AppText variant="caption" color="secondaryLabel">
            ▾
          </AppText>
        </Pressable>
        {open && (
          <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <View style={styles.menuHead}>
              <AppText variant="subheadline" style={{ fontWeight: "700" }}>
                {name}
              </AppText>
              <AppText variant="caption" color="secondaryLabel">
                {email}
              </AppText>
              <View style={[styles.tag, { backgroundColor: colors.label }]}>
                <AppText variant="caption" style={{ color: colors.background, fontWeight: "800" }}>
                  ADMINISTRADOR
                </AppText>
              </View>
            </View>
            {menu.map((item) => (
              <View key={item.label}>
                {item.destructive && <View style={[styles.sep, { backgroundColor: colors.separator }]} />}
                <Pressable onPress={() => choose(item)} accessibilityRole="menuitem" style={styles.item}>
                  <AppText variant="subheadline" color={item.destructive ? "danger" : "label"} style={item.destructive && { fontWeight: "600" }}>
                    {item.label}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingHorizontal: space.xl, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  brand: { fontWeight: "800" },
  sections: { flexDirection: "row", gap: space.xs },
  section: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  accountWrap: { marginLeft: "auto" },
  account: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: space.md, borderRadius: radius.md, borderWidth: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontWeight: "800" },
  menu: { position: "absolute", right: 0, top: 54, width: 280, borderRadius: radius.md, borderWidth: 1, padding: 6, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 24 },
  menuHead: { padding: space.md, gap: 2 },
  tag: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, marginTop: 6 },
  item: { paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.sm },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 4 },
});
