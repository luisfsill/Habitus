import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { beltFor } from "@/domain/gamification";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

/** The belt of a level as a small colored pill ("Faixa Azul"). */
export function BeltChip({ level }: { level: number }) {
  const belt = beltFor(level);
  return (
    <View style={[styles.chip, { backgroundColor: belt.color }]}>
      <AppText variant="caption" style={[styles.chipText, { color: belt.ink }]} maxFontSizeMultiplier={1.4}>
        {belt.name}
      </AppText>
    </View>
  );
}

interface Props {
  person: { name: string; username: string; level: number };
  onPress: () => void;
  /** Buttons under the row, e.g. Aceitar and Recusar. */
  children?: ReactNode;
}

/** Someone in a list: name, @ and belt; tapping opens the profile. */
export function PersonRow({ person, onPress, children }: Props) {
  const { colors } = useTheme();
  const belt = beltFor(person.level).name;
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`${person.name}, @${person.username}, ${belt}. Abrir perfil`}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={styles.who}>
          <AppText variant="headline" numberOfLines={1}>
            {person.name}
          </AppText>
          <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
            @{person.username}
          </AppText>
        </View>
        <BeltChip level={person.level} />
        <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />
      </Pressable>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  who: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", gap: space.sm },
  chip: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  chipText: { fontWeight: "700" },
});
