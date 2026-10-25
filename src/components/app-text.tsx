import { Text, type TextProps } from "react-native";

import { type Palette, type TextVariant, type, useTheme } from "@/theme";

interface Props extends TextProps {
  variant?: TextVariant;
  color?: keyof Palette;
  align?: "left" | "center" | "right";
}

export function AppText({ variant = "body", color = "label", align, style, ...rest }: Props) {
  const { colors } = useTheme();
  const large = variant === "largeTitle" || variant === "title1";
  return (
    <Text
      maxFontSizeMultiplier={large ? 1.6 : 2.2}
      style={[type[variant], { color: colors[color], textAlign: align }, style]}
      {...rest}
    />
  );
}
