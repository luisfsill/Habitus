import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { pinned, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";
import { css } from "./surface-parts";

interface Props {
  title: string;
  message: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// The picture on top follows what the button does; anything else gets the trash can.
const PICTURES: readonly { match: RegExp; ios: string; android: string; danger: boolean }[] = [
  { match: /^(bloquear)/i, ios: "hand.raised.fill", android: "block", danger: true },
  { match: /^(desfazer)/i, ios: "person.fill.xmark", android: "person_remove", danger: true },
  { match: /^(sair)/i, ios: "rectangle.portrait.and.arrow.right", android: "logout", danger: true },
  { match: /^(cancelar)/i, ios: "xmark.circle.fill", android: "cancel", danger: true },
  { match: /^(confirmar)/i, ios: "checkmark.circle.fill", android: "check_circle", danger: false },
  { match: /^(enviar)/i, ios: "bubble.left.fill", android: "chat", danger: false },
  { match: /^(resetar)/i, ios: "arrow.counterclockwise", android: "restart_alt", danger: true },
];
const TRASH = { ios: "trash.fill", android: "delete", danger: true };

/** Confirmation on the web, in place of the browser's confirm: a big picture of the action (the trash can for deletes) on a glass card over the dimmed app. Esc or a click outside cancels. */
export function ConfirmDialog({ title, message, action, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const picture = PICTURES.find((p) => p.match.test(action)) ?? TRASH;
  const tint = picture.danger ? colors.danger : colors.accent;

  // The picture pops in, then gives a short wiggle, like a lid rattling.
  const pop = useSharedValue(reduce ? 1 : 0.4);
  const tilt = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }, { rotate: `${tilt.get()}deg` }] }));
  useEffect(() => {
    if (reduce) return;
    pop.set(withSpring(1, { damping: 9, stiffness: 180 }));
    tilt.set(withDelay(180, withSequence(withTiming(-12, { duration: 90 }), withTiming(10, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(0, { duration: 80 }))));
  }, [reduce, pop, tilt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <View style={[StyleSheet.absoluteFill, pinned, styles.root]} accessibilityViewIsModal aria-modal role="alertdialog" aria-label={title}>
      <Pressable style={[StyleSheet.absoluteFill, DIM]} onPress={onCancel} accessibilityLabel="Cancelar" />
      <Glass style={styles.card}>
        <Animated.View style={[styles.badge, { backgroundColor: `${tint}26`, borderColor: `${tint}55` }, style]}>
          <Icon ios={picture.ios} android={picture.android} size={40} color={tint} />
        </Animated.View>
        <AppText variant="title3" align="center">
          {title}
        </AppText>
        <AppText variant="subheadline" color="secondaryLabel" align="center">
          {message}
        </AppText>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <PrimaryButton label="Cancelar" variant="tinted" onPress={onCancel} />
          </View>
          <View style={styles.button}>
            <PrimaryButton label={action} destructive={picture.danger} onPress={onConfirm} />
          </View>
        </View>
      </Glass>
    </View>
  );
}

const DIM = css({ backgroundColor: "rgba(1,8,16,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" });

const styles = StyleSheet.create({
  root: { zIndex: 60, alignItems: "center", justifyContent: "center", padding: space.lg },
  card: { width: "100%", maxWidth: 380, padding: space.xl, gap: space.md, alignItems: "center" },
  badge: { width: 84, height: 84, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  buttons: { flexDirection: "row", gap: space.sm, marginTop: space.sm, alignSelf: "stretch" },
  button: { flex: 1 },
});
