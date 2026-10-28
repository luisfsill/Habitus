import { StyleSheet, TextInput, View } from "react-native";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

/** "idle" shows nothing; any other string is an error message shown as is. */
export type UsernameStatus = "idle" | "checking" | "available" | "taken" | (string & {});

interface Props {
  value: string;
  onChange: (text: string) => void;
  status: UsernameStatus;
}

/** Text field with a fixed "@" on the left and the availability of the typed @ below. */
export function UsernameField({ value, onChange, status }: Props) {
  const { colors } = useTheme();
  const ok = status === "available";
  const note = status === "idle" ? null : status === "checking" ? "Verificando..." : ok ? "Disponível." : status === "taken" ? "Esse @ já está em uso." : status;
  return (
    <View>
      <View style={[styles.box, { borderColor: note && !ok && status !== "checking" ? colors.danger : "rgba(125,211,252,0.18)" }]}>
        <AppText variant="body" color="secondaryLabel">
          @
        </AppText>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="seu.arroba"
          placeholderTextColor={colors.secondaryLabel}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          accessibilityLabel="Seu @"
          style={[type.body, styles.input, { color: colors.label }]}
        />
      </View>
      {note && (
        <AppText variant="footnote" accessibilityLiveRegion="polite" style={styles.note} color={ok ? "accentText" : status === "checking" ? "secondaryLabel" : "danger"}>
          {note}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: HIT + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: "rgba(120,190,255,0.07)",
  },
  input: { flex: 1, minHeight: HIT, outlineStyle: "none" } as object,
  note: { marginTop: space.xs, marginLeft: space.xs },
});
