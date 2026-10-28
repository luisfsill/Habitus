import { StyleSheet, TextInput, View } from "react-native";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

/** "idle" shows nothing; any other string is an error message shown as is. */
export type UsernameStatus = "idle" | "checking" | "available" | "taken" | (string & {});

interface Props {
  value: string;
  onChange: (text: string) => void;
  status: UsernameStatus;
  /** Small label above the field, like TextField's. */
  label?: string;
}

/** Text field with a fixed "@" on the left and the availability of the typed @ below. */
export function UsernameField({ value, onChange, status, label }: Props) {
  const { colors } = useTheme();
  const ok = status === "available";
  const note = status === "idle" ? null : status === "checking" ? "Verificando..." : ok ? "Disponível." : status === "taken" ? "Esse @ já está em uso." : status;
  const error = note && !ok && status !== "checking";
  // Same glass as TextField, so both fields match side by side.
  const glass = { backgroundColor: colors.glass, borderColor: error ? colors.danger : colors.glassEdge, boxShadow: `inset 0 1px 0 ${colors.glassRim}` };
  return (
    <View style={styles.root}>
      {label && (
        <AppText variant="footnote" color="secondaryLabel">
          {label}
        </AppText>
      )}
      <View style={[styles.box, glass]}>
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
  root: { gap: space.xs },
  box: {
    minHeight: HIT,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, minHeight: HIT, outlineStyle: "none" } as object,
  note: { marginLeft: space.xs },
});
