import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 132;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const LENGTH = 2 * Math.PI * R;

interface Props {
  planName: string;
  days: number;
  /** "27 de novembro", or null when the access has no end (admin, unlimited). */
  validUntil: string | null;
  price: string;
  /** "28/10 às 05:52". */
  paidAt: string;
  orderCode: string;
}

/** The ring that fills once, with the days the payment added in its middle. */
function DaysRing({ days }: { days: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const done = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) done.set(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [done, reduceMotion]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - done.get()) }));
  return (
    <View style={styles.ring}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.ringTrack} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.success}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${LENGTH} ${LENGTH}`}
          animatedProps={props}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <AppText variant="largeTitle" style={styles.days}>
        {days}
      </AppText>
      <AppText variant="caption" color="secondaryLabel">
        {days === 1 ? "dia" : "dias"}
      </AppText>
    </View>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.line, { borderColor: colors.separator }]}>
      <AppText variant="subheadline" color="secondaryLabel">
        {label}
      </AppText>
      <AppText variant="subheadline" style={mono && styles.mono}>
        {value}
      </AppText>
    </View>
  );
}

/** "Pagamento confirmado" as a receipt: the days ring, the active plan and the payment details. */
export function PixReceipt({ planName, days, validUntil, price, paidAt, orderCode }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <DaysRing days={days} />
      <View style={[styles.pill, { backgroundColor: colors.successSoft }]}>
        <Icon ios="checkmark" android="check_circle" size={14} color={colors.successText} />
        <AppText variant="footnote" color="successText" style={styles.bold}>
          Pagamento confirmado
        </AppText>
      </View>
      <View style={styles.head}>
        <AppText variant="title1" align="center">
          Plano {planName} ativo
        </AppText>
        <AppText variant="subheadline" color="secondaryLabel" align="center">
          {validUntil ? `Até ${validUntil}` : "Acesso sem prazo"}
        </AppText>
      </View>
      <View style={[styles.lines, { borderColor: colors.separator }]}>
        <Line label="Pago com" value={`Pix · ${price}`} />
        <Line label="Data" value={paidAt} />
        <Line label="Pedido" value={orderCode} mono />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: space.lg, paddingTop: space.lg },
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  days: { fontVariant: ["tabular-nums"] },
  pill: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 999 },
  bold: { fontWeight: "600" },
  head: { gap: space.xs },
  lines: { alignSelf: "stretch", borderBottomWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  mono: { fontVariant: ["tabular-nums"], letterSpacing: 1 },
});
