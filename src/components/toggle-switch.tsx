import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

// Port of a CSS toggle (80 × 40, grey off, green on) at 3/5 of its size.
const W = 48;
const H = 24;
const INSET = 3;
const HANDLE = H - 2 * INSET;
const TRAVEL = W - 2 * INSET - HANDLE;
const EASE = { duration: 300, easing: Easing.inOut(Easing.ease) };

const OFF = "#dddddd";
const ON = "#05c46b";

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

/** On/off switch: grey track that turns green, white handle that slides across. */
export function ToggleSwitch({ value, onValueChange, accessibilityLabel }: Props) {
  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, EASE));
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [OFF, ON]),
    boxShadow: progress.get() > 0.5 ? "inset 0 0 0 2px #04b360" : "inset 0 0 0 2px #cccccc",
  }));
  const handle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * TRAVEL }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      onPress={() => {
        void Haptics.selectionAsync();
        onValueChange(!value);
      }}>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.handle, handle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: INSET },
  handle: { width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: "#ffffff", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" },
});
