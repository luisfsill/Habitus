import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props extends Pick<TextInputProps, "autoComplete" | "autoCapitalize" | "keyboardType" | "textContentType" | "onSubmitEditing" | "returnKeyType"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Password field with a show/hide button. */
  secure?: boolean;
  error?: string;
}

/** Text field whose label floats up and whose border lights up in cobalt while focused. */
export function AuthField({ label, value, onChangeText, secure, error, ...input }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const lifted = useSharedValue(value ? 1 : 0);
  const glow = useSharedValue(0);

  useEffect(() => {
    lifted.set(withTiming(focused || value ? 1 : 0, { duration: 180 }));
    glow.set(withTiming(focused ? 1 : 0, { duration: 220 }));
  }, [focused, value, lifted, glow]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -11 * lifted.get() }, { scale: 1 - 0.22 * lifted.get() }],
  }));
  const boxStyle = useAnimatedStyle(() => ({ shadowOpacity: 0.7 * glow.get() }));
  const border = error ? colors.danger : focused ? colors.accent : "rgba(255,255,255,0.1)";

  return (
    <View>
      <Animated.View style={[styles.box, { borderColor: border, shadowColor: colors.accent }, boxStyle]}>
        <Animated.Text
          pointerEvents="none"
          style={[type.callout, styles.label, { color: focused ? colors.accentText : colors.secondaryLabel }, labelStyle]}
          numberOfLines={1}>
          {label}
        </Animated.Text>
        <TextInput
          autoCapitalize="none"
          {...input}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && hidden}
          autoCorrect={false}
          placeholderTextColor={colors.secondaryLabel}
          style={[type.body, styles.input, { color: colors.label }]}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.eye}>
            <Icon ios={hidden ? "eye" : "eye.slash"} android={hidden ? "visibility" : "visibility_off"} size={20} color={colors.secondaryLabel} />
          </Pressable>
        )}
      </Animated.View>
      {error ? (
        <AppText variant="footnote" style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  label: { position: "absolute", left: space.lg, right: 52, transformOrigin: "left center" },
  input: { paddingHorizontal: space.lg, paddingTop: 20, paddingBottom: 6, minHeight: 58, outlineStyle: "none" } as object,
  eye: { position: "absolute", right: 4, width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
  error: { marginTop: space.xs, marginLeft: space.xs },
});
