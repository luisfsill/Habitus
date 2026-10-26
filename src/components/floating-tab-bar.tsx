import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";

import { HIT, pinned, radius, space, useTheme } from "@/theme";

import { Icon } from "./icon";
import { MAX_WIDTH } from "./screen";

export interface TabItem {
  key: string;
  label: string;
  ios: string;
  android: string;
}

interface Props {
  tabs: readonly TabItem[];
  active: string;
  onPress: (key: string) => void;
  bottomInset: number;
}

// Ease-out with no overshoot: the pill glides and stops, it does not bounce.
const GLIDE = { duration: 260, easing: Easing.out(Easing.cubic) };

function Tab({ tab, focused, onPress }: { tab: TabItem; focused: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: withTiming(focused ? 1.08 : 1, GLIDE) }] }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tab}>
      <Animated.View style={pop}>
        <Icon ios={tab.ios} android={tab.android} size={26} color={focused ? colors.label : colors.secondaryLabel} />
      </Animated.View>
    </Pressable>
  );
}

/** Floating, see-through grey tab bar with icons only; a grey pill glides under the active tab. */
export function FloatingTabBar({ tabs, active, onPress, bottomInset }: Props) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.key === active));
  const slot = tabs.length ? width / tabs.length : 0;
  const pill = useAnimatedStyle(() => ({ width: slot, transform: [{ translateX: withTiming(index * slot, GLIDE) }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, pinned, { paddingBottom: bottomInset + space.md }]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - 2 * PAD)}
        style={[styles.bar, { borderColor: colors.separator, shadowColor: colors.shadow, backgroundColor: scheme === "dark" ? BAR_DARK : BAR_LIGHT }]}>
        <BlurView intensity={30} tint={scheme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        {width > 0 && <Animated.View style={[styles.pill, { backgroundColor: colors.fill }, pill]} />}
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            focused={tab.key === active}
            onPress={() => {
              if (tab.key !== active) void Haptics.selectionAsync();
              onPress(tab.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const PAD = 6;
/** Dark grey at low opacity, so the page shows through the blur. */
const BAR_DARK = "rgba(44,44,46,0.45)";
const BAR_LIGHT = "rgba(120,120,128,0.18)";

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: space.md },
  bar: {
    flexDirection: "row",
    width: "100%",
    // As wide as the page column, so it lines up with the section hairlines.
    maxWidth: MAX_WIDTH,
    padding: PAD,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  pill: { position: "absolute", top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill },
  tab: { flex: 1, minHeight: HIT + 8, alignItems: "center", justifyContent: "center" },
});
