import { useFonts } from "expo-font";
import { Text, View } from "react-native";

import { GLYPHS } from "./icon-glyphs";

interface Props {
  ios: string;
  android: string;
  size?: number;
  color: string;
}

// Only the glyphs the app uses (scripts/build-icon-font.mjs): a few KB instead of expo-symbols' ~970 KB font.
const FONT = { "habitus-icons": require("../../assets/fonts/icons.ttf") as number };

/** Material Symbol on the web, from the app's own icon subset. Decorative. */
export function Icon({ android, size = 22, color }: Props) {
  const [loaded] = useFonts(FONT);
  const code = GLYPHS[android];
  return (
    <View style={{ width: size, height: size }} aria-hidden>
      {loaded && code !== undefined && (
        <Text style={{ fontFamily: "habitus-icons", color, fontSize: size, lineHeight: size }}>{String.fromCharCode(code)}</Text>
      )}
    </View>
  );
}
