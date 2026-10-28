import * as Haptics from "expo-haptics";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { useEffect } from "react";
import { Modal, Platform, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { giftMessage, licenseLabel } from "@/domain/invites";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

interface Props {
  /** License days of the redeemed code; null = unlimited. */
  days: number | null;
  onClose: () => void;
}

// The present with sparkles ("Register User", LottieFiles, Lottie Simple License); the text comes in as it opens.
const ANIMATION = require("../../assets/animations/gift.json") as AnimationObject;
const OPEN_MS = 1200;
const SIZE = 280;

/** "Parabéns pelo seu presente": full screen over everything, the gift opens with fireworks, then the prize. */
export function GiftOpening({ days, onClose }: Props) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const text = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    text.set(withDelay(OPEN_MS, withTiming(1, { duration: 600 })));
    if (Platform.OS === "web") return;
    const id = setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), OPEN_MS);
    return () => clearTimeout(id);
  }, [reduce, text]);
  const textStyle = useAnimatedStyle(() => ({ opacity: text.get(), transform: [{ translateY: 16 * (1 - text.get()) }] }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]} accessibilityViewIsModal>
        {/* Loops: its last frame is empty. With "reduce motion", a still gift instead. */}
        {reduce ? (
          <View style={[styles.animation, styles.still]}>
            <Icon ios="gift.fill" android="redeem" size={120} color={colors.accent} />
          </View>
        ) : (
          <LottieView source={ANIMATION} autoPlay loop style={styles.animation} webStyle={styles.animation} />
        )}
        <Animated.View style={[styles.copy, textStyle]} accessibilityLiveRegion="polite">
          <AppText variant="title1" align="center">
            Parabéns!
          </AppText>
          <AppText variant="headline" color="secondaryLabel" align="center">
            Você ganhou um presente
          </AppText>
          <AppText variant="title2" color="accentText" align="center" style={styles.prize}>
            {days === null ? "Acesso ilimitado" : licenseLabel(days)}
          </AppText>
          <AppText variant="subheadline" color="secondaryLabel" align="center">
            {giftMessage(days)}
          </AppText>
          <View style={styles.button}>
            <PrimaryButton label="Aproveitar" glow onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.lg },
  animation: { width: SIZE, height: SIZE },
  still: { alignItems: "center", justifyContent: "center" },
  copy: { alignItems: "center", gap: space.sm, maxWidth: 360, alignSelf: "stretch" },
  prize: { marginTop: space.sm },
  button: { alignSelf: "stretch", marginTop: space.lg },
});
