import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { radius, space, type, useTheme } from "@/theme";

const LENGTH = 6;

interface Props {
  value: string;
  onChange: (code: string) => void;
  /** Called once all six digits are in. */
  onComplete: (code: string) => void;
  error?: boolean;
}

/**
 * Six boxes under one transparent input that covers them, so a tap anywhere
 * focuses it and pasting "123 456" or the iOS code suggestion fills every box.
 */
export function CodeInput({ value, onChange, onComplete, error }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const change = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, LENGTH);
    onChange(digits);
    if (digits.length === LENGTH) onComplete(digits);
  };

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, LENGTH - 1);
          const border = error ? colors.danger : active ? colors.accent : "rgba(255,255,255,0.12)";
          return (
            <View
              key={i}
              style={[styles.box, { borderColor: border, shadowColor: colors.accent, shadowOpacity: active ? 0.7 : 0 }]}>
              {value[i] ? (
                <Animated.Text entering={ZoomIn.springify()} style={[type.title1, { color: colors.label }]}>
                  {value[i]}
                </Animated.Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={LENGTH + 2}
        accessibilityLabel="Código de 6 dígitos"
        style={styles.hidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  // Kept on screen (not display:none) so focus, paste and autofill still work.
  hidden: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
});
