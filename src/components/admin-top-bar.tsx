import { Pressable, StyleSheet, View } from "react-native";

import { MAX_WIDTH, radius, space, useTheme } from "@/theme";

import { AccountMenu, type AccountMenuItem } from "./account-menu";
import { AppText } from "./app-text";

export type AdminSection = "users" | "plans" | "invites";

const LABELS: Record<AdminSection, string> = { users: "Usuários", plans: "Planos e preços", invites: "Convites" };

interface Props {
  section: AdminSection;
  onSection: (section: AdminSection) => void;
  name: string;
  email: string;
  menu: AccountMenuItem[];
}

/** Desktop/tablet header of the admin panel: sections on the left, the admin's account menu on the right. */
export function AdminTopBar({ section, onSection, name, email, menu }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { borderColor: colors.separator }]}>
      <View style={styles.inner}>
        <AppText variant="headline" style={styles.brand}>
          <AppText variant="headline" color="accent" style={styles.brand}>
            Habitus
          </AppText>{" "}
          Admin
        </AppText>
        <View style={styles.sections}>
          {(["users", "plans", "invites"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => onSection(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === s }}
              style={[styles.section, section === s && { backgroundColor: colors.accentSoft }]}>
              <AppText variant="subheadline" color={section === s ? "accentText" : "secondaryLabel"} style={{ fontWeight: "600" }}>
                {LABELS[s]}
              </AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.account}>
          <AccountMenu name={name} email={email} tag="ADMINISTRADOR" menu={menu} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  // Same column as the page content below; the bar's hairline still spans the window.
  inner: { flexDirection: "row", alignItems: "center", gap: space.lg, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: space.xl },
  brand: { fontWeight: "800" },
  sections: { flexDirection: "row", gap: space.xs },
  section: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  account: { marginLeft: "auto" },
});
