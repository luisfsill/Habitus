import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { CONSTELLATION_DAYS, skyExtent, type Star } from "@/domain/sky";
import { pinned } from "@/theme";

export interface GratitudeSkyProps {
  stars: readonly Star[];
  lines: readonly (readonly [number, number])[];
  born: number | null;
  selected: number | null;
  onSelect?: (index: number | null) => void;
}

const TINTS = ["#BED4FF", "#DCE6FF", "#FFF6E8", "#FFE2BE"];

/**
 * Native: the same sky, still (the web adds the live night, the Milky Way, twinkling and the newborn star's flare,
 * gratitude-sky.web.tsx). A tap on a star opens its phrase and shows its constellation's lines.
 */
export function GratitudeSky({ stars, lines, selected, onSelect }: GratitudeSkyProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  const unit = Math.min(w, h * 0.8) / 2 / skyExtent(stars);
  const at = (s: Star) => ({ x: w / 2 + s.x * unit, y: h * 0.42 + s.y * unit });
  return (
    <View style={[StyleSheet.absoluteFill, pinned]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="night" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#01020A" />
            <Stop offset="0.65" stopColor="#060B1C" />
            <Stop offset="0.88" stopColor="#0E1830" />
          </LinearGradient>
          {TINTS.map((c, i) => (
            <RadialGradient key={c} id={`star${i}`}>
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.12" stopColor={c} stopOpacity={0.8} />
              <Stop offset="0.4" stopColor={c} stopOpacity={0.12} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#night)" onPress={() => onSelect?.(null)} />
        <G stroke="#BED2FF" strokeOpacity={0.7} strokeWidth={1.4}>
          {/* Only the tapped star's constellation shows its lines, as on the web. */}
          {lines.filter(([a]) => selected !== null && Math.floor(a / CONSTELLATION_DAYS) === Math.floor(selected / CONSTELLATION_DAYS)).map(([a, b]) => (
            <Line key={`${a}-${b}`} x1={at(stars[a]).x} y1={at(stars[a]).y} x2={at(stars[b]).x} y2={at(stars[b]).y} />
          ))}
        </G>
        {w > 0 &&
          stars.map((s, i) => {
            const { x, y } = at(s);
            const r = (1 + 2.6 * s.size) * 1.1;
            return (
              <G key={s.day} onPress={() => onSelect?.(i)}>
                <Circle cx={x} cy={y} r={Math.max(r * 6, 14)} fill={`url(#star${Math.min(3, Math.floor(s.tint * 4))})`} />
                {i === selected && <Circle cx={x} cy={y} r={Math.max(10, r * 4)} stroke="#FFFFFF" strokeOpacity={0.75} fill="none" />}
              </G>
            );
          })}
        <Path d={`M0 ${h * 0.88} Q${w * 0.2} ${h * 0.84} ${w * 0.4} ${h * 0.87} T${w * 0.75} ${h * 0.85} T${w} ${h * 0.87} V${h} H0Z`} fill="#010208" />
      </Svg>
    </View>
  );
}
