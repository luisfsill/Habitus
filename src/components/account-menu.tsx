import { type ComponentRef, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { Easing, FadeInRight, FadeOutRight, interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { backdrops, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ThemeToggle, TRACK_W } from "./theme-toggle";

export interface AccountMenuItem {
  label: string;
  icon: { ios: string; android: string };
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  name: string;
  email: string;
  /** Small tag under the e-mail in the open menu, e.g. "ADMINISTRADOR". */
  tag?: string;
  /** Menu items in order; a destructive one ("Sair") goes last, after a separator. */
  menu: AccountMenuItem[];
  /** Shows the light/dark switch at the top of the menu. */
  onTheme?: (theme: "light" | "dark") => void;
  /** Avatar only (narrow screens); name and e-mail still show inside the menu. */
  compact?: boolean;
  /** 0…1, today's tips done: fills the ring around the avatar. Omitted, only the track shows. */
  progress?: number;
  /** Profile photo link; null shows the person icon. */
  photo?: string | null;
}

const RING = 46;
const RING_STROKE = 3;

const SHINE_GLOW = "#9CC2FF";

// The menu slides in from the right and leaves the same way.
const MENU_IN = FadeInRight.duration(300).easing(Easing.out(Easing.cubic));
const MENU_OUT = FadeOutRight.duration(220).easing(Easing.in(Easing.cubic));

/**
 * Glass circle with a person icon, inside a ring that fills with today's progress.
 * Each tap (`flash` goes up) sends a streak of light across the glass and lights its rim.
 */
function Avatar({ progress = 0, flash, photo }: { progress?: number; flash: number; photo?: string | null }) {
  const { colors, scheme } = useTheme();
  const rim = scheme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.1)";
  const shine = useSharedValue(0);
  useEffect(() => {
    if (flash > 0) shine.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) })));
  }, [flash, shine]);
  const rimStyle = useAnimatedStyle(() => ({ borderColor: interpolateColor(shine.get(), [0, 0.4, 1], [rim, SHINE_GLOW, rim]) }));
  const streakStyle = useAnimatedStyle(() => ({
    opacity: shine.get() > 0 && shine.get() < 1 ? 1 : 0,
    transform: [{ translateX: -28 + shine.get() * 56 }, { skewX: "-20deg" }],
  }));
  const r = (RING - RING_STROKE) / 2;
  const length = 2 * Math.PI * r;
  const done = Math.min(Math.max(progress, 0), 1);
  const glass = { backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" };
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.ringTrack} strokeWidth={RING_STROKE} fill="none" />
        {done > 0 && (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={r}
            stroke={colors.accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - done)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        )}
      </Svg>
      <Animated.View style={[styles.avatar, glass, rimStyle]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Icon ios="person.fill" android="person" size={20} color={colors.label} />
        )}
        <Animated.View pointerEvents="none" style={[styles.streak, streakStyle]} />
      </Animated.View>
    </View>
  );
}

/** Account button (avatar, name, e-mail) that opens a menu of account actions. */
export function AccountMenu({ name, email, tag, menu, onTheme, compact, progress, photo }: Props) {
  const { colors, scheme } = useTheme();
  const fill = backdrops[scheme];
  const [open, setOpen] = useState(false);
  // Picking an item closes the menu without its fade: the screen behind may be left (a tab stays mounted), and a
  // fade still running there would play again, menu open, on the way back.
  const [instant, setInstant] = useState(false);
  const wrap = useRef<ComponentRef<typeof View>>(null);
  const [flash, setFlash] = useState(0);
  // The chevron turns to show the menu is open.
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(withSpring(open ? 1 : 0, { damping: 14, stiffness: 220 }));
  }, [open, turn]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 180}deg` }] }));

  // Web only (this menu lives in the web layouts): a click outside, or Escape, closes it.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onPointer = (event: PointerEvent) => {
      if (!(wrap.current as unknown as HTMLElement | null)?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (item: AccountMenuItem) => {
    setInstant(true);
    // Next frame: the menu has rendered without its exit animation, so it is simply gone.
    requestAnimationFrame(() => {
      setOpen(false);
      item.onPress();
    });
  };

  return (
    <View ref={wrap} style={styles.wrap}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          setFlash((n) => n + 1);
          setInstant(false);
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Conta de ${name}`}
        accessibilityState={{ expanded: open }}
        style={[styles.account, compact && styles.compact, fill]}>
        <Avatar progress={progress} flash={flash} photo={photo} />
        {!compact && (
          <>
            <View style={styles.who}>
              <AppText variant="subheadline" numberOfLines={1} style={styles.bold}>
                {name}
              </AppText>
              <AppText variant="caption" color="secondaryLabel" numberOfLines={1}>
                {email}
              </AppText>
            </View>
            <Animated.View style={chevronStyle}>
              <Icon ios="chevron.down" android="expand_more" size={14} color={colors.secondaryLabel} />
            </Animated.View>
          </>
        )}
      </Pressable>
      {open && (
        <Animated.View
          entering={MENU_IN}
          exiting={instant ? undefined : MENU_OUT}
          accessibilityRole="menu"
          style={[styles.menu, fill, { borderColor: colors.separator, shadowColor: colors.shadow }]}>
          <View style={styles.menuHead}>
            <AppText variant="subheadline" style={styles.bold}>
              {name}
            </AppText>
            <AppText variant="caption" color="secondaryLabel">
              {email}
            </AppText>
            {tag && (
              <View style={[styles.tag, { backgroundColor: colors.label }]}>
                <AppText variant="caption" style={{ color: colors.background, fontWeight: "800" }}>
                  {tag}
                </AppText>
              </View>
            )}
          </View>
          {onTheme && <ThemeToggle onChange={onTheme} />}
          {menu.map((item) => (
            <View key={item.label}>
              {item.destructive && <View style={[styles.sep, { backgroundColor: colors.separator }]} />}
              <Pressable onPress={() => choose(item)} accessibilityRole="menuitem" style={styles.item}>
                {/* Same width as the theme switch above, so every label starts on one line. */}
                <View style={[styles.lead, onTheme && { width: TRACK_W }]}>
                  <Icon ios={item.icon.ios} android={item.icon.android} size={20} color={item.destructive ? colors.danger : colors.secondaryLabel} />
                </View>
                <AppText variant="body" color={item.destructive ? "danger" : "label"} style={item.destructive && styles.bold}>
                  {item.label}
                </AppText>
              </Pressable>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },
  account: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: space.md, borderRadius: radius.md },
  ring: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  streak: { position: "absolute", top: -6, bottom: -6, width: 10, backgroundColor: "rgba(255,255,255,0.55)" },
  who: { maxWidth: 180 },
  compact: { paddingVertical: 4, paddingLeft: 4, paddingRight: 4, borderRadius: radius.pill },
  bold: { fontWeight: "700" },
  menu: {
    position: "absolute",
    right: 0,
    top: 54,
    // Hugs its widest row (usually the e-mail) instead of a fixed width; the floor keeps "Renovar plano" on one line.
    minWidth: 250,
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 6,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuHead: { padding: space.md, gap: 2 },
  tag: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, marginTop: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.sm },
  lead: { alignItems: "center" },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginHorizontal: 4 },
});
