import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { MAX_AFFIRMATIONS, MAX_TEXT_LENGTH } from "@/domain/app-data";
import { HIT, radius, space, type, useTheme } from "@/theme";

import { PrimaryButton } from "./primary-button";
import { Icon } from "./icon";

interface Props {
  value: readonly string[];
  onChange: (lines: string[]) => void;
}

export function AffirmationsEditor({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string[]>([...value]);
  const commit = (lines: string[]) => onChange(lines.map((l) => l.trim()).filter(Boolean));

  const update = (i: number, text: string) => setDraft(draft.map((l, j) => (j === i ? text : l)));
  const remove = (i: number) => {
    const next = draft.filter((_, j) => j !== i);
    setDraft(next);
    commit(next);
  };

  return (
    <View style={styles.list}>
      {draft.map((line, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            value={line}
            onChangeText={(t) => update(i, t)}
            onBlur={() => commit(draft)}
            maxLength={MAX_TEXT_LENGTH}
            placeholder="Sou…"
            placeholderTextColor={colors.secondaryLabel}
            accessibilityLabel={`Afirmação ${i + 1}`}
            style={[type.body, styles.input, { color: colors.label, backgroundColor: colors.fill }]}
          />
          <Pressable
            onPress={() => remove(i)}
            accessibilityRole="button"
            accessibilityLabel={`Remover afirmação ${i + 1}`}
            style={styles.remove}>
            <Icon ios="minus.circle.fill" android="remove_circle" size={24} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      {draft.length < MAX_AFFIRMATIONS && (
        <PrimaryButton label="Adicionar afirmação" variant="tinted" onPress={() => setDraft([...draft, ""])} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  input: { flex: 1, minHeight: HIT, borderRadius: radius.sm, paddingHorizontal: space.md },
  remove: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
});
