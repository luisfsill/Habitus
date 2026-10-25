import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

interface Props {
  ios: string;
  android: string;
  size?: number;
  color: string;
}

/** SF Symbol on iOS, Material Symbol on Android and web. Decorative. */
export function Icon({ ios, android, size = 22, color }: Props) {
  const name = { ios, android, web: android } as SymbolName;
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
