import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props extends Pick<TextInputProps, "value" | "onChangeText" | "placeholder" | "keyboardType" | "autoCapitalize" | "autoComplete" | "onSubmitEditing" | "editable"> {
  label: string;
}

/** Labelled input that follows the app theme (admin forms). */
export function TextField({ label, ...input }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <AppText variant="footnote" color="secondaryLabel">
        {label}
      </AppText>
      <TextInput
        autoCorrect={false}
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.secondaryLabel}
        style={[type.body, styles.input, { color: colors.label, backgroundColor: colors.fill }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs, flexGrow: 1, flexBasis: 160 },
  input: { minHeight: HIT, borderRadius: radius.sm, paddingHorizontal: space.md },
});
