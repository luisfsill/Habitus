import { type StyleProp, StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props extends Pick<TextInputProps, "value" | "onChangeText" | "placeholder" | "keyboardType" | "autoCapitalize" | "autoComplete" | "onSubmitEditing" | "editable" | "multiline" | "maxLength"> {
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Labelled input that follows the app theme (admin and reminder forms). */
export function TextField({ label, style, ...input }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, style]}>
      <AppText variant="footnote" color="secondaryLabel">
        {label}
      </AppText>
      <TextInput
        autoCorrect={false}
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.secondaryLabel}
        style={[type.body, styles.input, input.multiline && styles.multiline, { color: colors.label, backgroundColor: colors.fill }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs, flexGrow: 1, flexBasis: 160 },
  input: { minHeight: HIT, borderRadius: radius.sm, paddingHorizontal: space.md },
  multiline: { minHeight: 88, paddingVertical: space.md, textAlignVertical: "top" },
});
