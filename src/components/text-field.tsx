import { useState } from "react";
import { type StyleProp, StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props extends Pick<TextInputProps, "value" | "onChangeText" | "placeholder" | "keyboardType" | "autoCapitalize" | "autoComplete" | "onSubmitEditing" | "editable" | "multiline" | "maxLength"> {
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Labelled glass input (admin and reminder forms); focused, its edge lights up like water catching the light. */
export function TextField({ label, style, ...input }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const glass = {
    color: colors.label,
    backgroundColor: colors.glass,
    borderColor: focused ? colors.accent : colors.glassEdge,
    boxShadow: `inset 0 1px 0 ${colors.glassRim}${focused ? `, 0 0 0 3px ${colors.accentSoft}` : ""}`,
  };
  return (
    <View style={[styles.root, style]}>
      <AppText variant="footnote" color="secondaryLabel">
        {label}
      </AppText>
      <TextInput
        autoCorrect={false}
        {...input}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.secondaryLabel}
        style={[type.body, styles.input, input.multiline && styles.multiline, glass]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs, flexGrow: 1, flexBasis: 160 },
  input: { minHeight: HIT, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.md },
  multiline: { minHeight: 88, paddingVertical: space.md, textAlignVertical: "top" },
});
