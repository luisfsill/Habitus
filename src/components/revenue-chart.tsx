import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { formatPrice } from "@/domain/access";
import type { Bar } from "@/domain/payments";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

const PLOT = 140;
// Room above the tallest bar for the max value label.
const TOP = 18;
const LABEL_W = 44;

interface Props {
  bars: readonly Bar[];
  /** Index of the highlighted bar; its value and date show above the chart. */
  selected: number | null;
  onSelect: (index: number) => void;
}

/** Bar with rounded top corners and a square base. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(w / 2, 4, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Revenue bars (one per day or month): tap a bar to read its value; empty days are a thin line on the base. */
export function RevenueChart({ bars, selected, onSelect }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const n = bars.length;
  const slot = n > 0 ? width / n : 0;
  const barW = Math.max(2, slot * 0.6);
  const base = TOP + PLOT;
  const max = Math.max(0, ...bars.map((b) => b.cents));
  const pick = selected !== null ? bars[selected] : undefined;
  // Day labels every 7 bars counted back from today; month labels on every bar.
  const step = n > 12 ? 7 : 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <AppText variant="title2" style={styles.digits}>
          {pick ? formatPrice(pick.cents) : "—"}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel">
          {pick ? pick.label : "Toque numa barra"}
        </AppText>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: base }}>
        {width > 0 && (
          <Svg width={width} height={base}>
            {max > 0 && <Line x1={0} x2={width} y1={TOP} y2={TOP} stroke={colors.separator} strokeDasharray="4 4" />}
            <Line x1={0} x2={width} y1={base} y2={base} stroke={colors.separator} />
            {bars.map((b, i) => {
              const x = i * slot + (slot - barW) / 2;
              const on = i === selected;
              if (b.cents === 0) return <Line key={i} x1={x} x2={x + barW} y1={base - 1} y2={base - 1} stroke={on ? colors.accent : colors.separator} strokeWidth={2} />;
              const h = Math.max(3, b.ratio * PLOT);
              return <Path key={i} d={barPath(x, base - h, barW, h)} fill={colors.accent} opacity={on || selected === null ? 1 : 0.35} />;
            })}
          </Svg>
        )}
        {max > 0 && (
          <AppText variant="caption" color="secondaryLabel" style={styles.max}>
            {formatPrice(max)}
          </AppText>
        )}
        {width > 0 &&
          bars.map((b, i) => (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${formatPrice(b.cents)}`}
              accessibilityState={{ selected: i === selected }}
              // Full plot height keeps each target >= 44 pt tall even when 30 bars make it narrow.
              style={[styles.hit, { left: i * slot, width: slot }]}
            />
          ))}
      </View>
      <View style={styles.axis}>
        {width > 0 &&
          bars.map((b, i) =>
            (n - 1 - i) % step === 0 ? (
              <AppText
                key={i}
                variant="caption"
                color={i === selected ? "accentText" : "secondaryLabel"}
                align="center"
                numberOfLines={1}
                style={[styles.tick, { left: Math.min(Math.max(0, i * slot + slot / 2 - LABEL_W / 2), width - LABEL_W) }]}>
                {b.label}
              </AppText>
            ) : null,
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  readout: { gap: 2 },
  digits: { fontVariant: ["tabular-nums"] },
  max: { position: "absolute", right: 0, top: 0 },
  hit: { position: "absolute", top: 0, bottom: 0 },
  axis: { height: 16 },
  tick: { position: "absolute", width: LABEL_W, fontVariant: ["tabular-nums"] },
});
