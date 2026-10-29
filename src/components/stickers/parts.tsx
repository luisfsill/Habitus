import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect, Text } from "react-native-svg";

// Fixed sticker colors (not theme tokens): the white rim and dark outline make each one read on light and dark.
export const INK = "#2B1D0E";
export const YELLOW = "#FFD23F";
export const BLUSH = "#FF8FA3";
export const TEAR = "#5BC0EB";
export const RED = "#E63946";
export const WHITE = "#FFFFFF";

export type StickerArt = (props: { size: number }) => ReactNode;

const line = { stroke: INK, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
export const outline = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" } as const;

/** A 100×100 drawing scaled to a square `size` box, on a transparent background. */
export function Frame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {children}
    </Svg>
  );
}

/** A round head with the sticker's white rim, outline and a little shine. */
export function Head({ fill = YELLOW }: { fill?: string }) {
  return (
    <>
      <Circle cx={50} cy={50} r={47} fill={WHITE} />
      <Circle cx={50} cy={50} r={40} fill={fill} {...outline} />
      <Ellipse cx={34} cy={27} rx={10} ry={5} fill={WHITE} opacity={0.5} transform="rotate(-30 34 27)" />
    </>
  );
}

/** A pastel disc behind an object sticker, with the same rim and outline as a head. */
export function Disc({ fill }: { fill: string }) {
  return (
    <>
      <Circle cx={50} cy={50} r={47} fill={WHITE} />
      <Circle cx={50} cy={50} r={40} fill={fill} {...outline} />
    </>
  );
}

/** An outlined stroke, the pen every face is drawn with. */
export function Line({ d, color = INK, width = 4 }: { d: string; color?: string; width?: number }) {
  return <Path d={d} {...line} stroke={color} strokeWidth={width} />;
}

export function DotEyes({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  return (
    <>
      <Ellipse cx={37 + dx} cy={44 + dy} rx={4.5} ry={6} fill={INK} />
      <Ellipse cx={63 + dx} cy={44 + dy} rx={4.5} ry={6} fill={INK} />
    </>
  );
}

/** Eyes shut in a smile: two upturned arcs. */
export function HappyEyes() {
  return <Line d="M29 47 Q37 37 45 47 M55 47 Q63 37 71 47" />;
}

export function Cheeks() {
  return (
    <>
      <Ellipse cx={27} cy={58} rx={6} ry={4} fill={BLUSH} opacity={0.8} />
      <Ellipse cx={73} cy={58} rx={6} ry={4} fill={BLUSH} opacity={0.8} />
    </>
  );
}

/** An open laughing mouth with a tongue. */
export function Laugh() {
  return (
    <>
      <Path d="M30 57 Q50 88 70 57 Z" fill={INK} {...outline} />
      <Path d="M40 71 Q50 64 60 71 Q55 78 50 78 Q45 78 40 71 Z" fill={BLUSH} />
    </>
  );
}

const HEART = "M0 18 C-18 6 -23 -5 -16 -13 C-10 -20 -3 -17 0 -10 C3 -17 10 -20 16 -13 C23 -5 18 6 0 18 Z";

/** A heart centered on (x, y); `s` = 1 is about 46 wide. */
export function Heart({ x, y, s, fill = RED }: { x: number; y: number; s: number; fill?: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d={HEART} fill={fill} stroke={INK} strokeWidth={4 / s} strokeLinejoin="round" />
    </G>
  );
}

export function Drop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M0 -10 C5 -3 8 1 8 5 A8 8 0 0 1 -8 5 C-8 1 -5 -3 0 -10 Z" fill={TEAR} stroke={INK} strokeWidth={3 / s} />
    </G>
  );
}

/** A ribbon across the lower disc with a short caption, one or two lines. */
export function Caption({ lines, fill }: { lines: readonly string[]; fill: string }) {
  const top = lines.length > 1 ? 60 : 66;
  return (
    <>
      <Rect x={6} y={top} width={88} height={92 - top} rx={10} fill={fill} {...outline} />
      {lines.map((text, i) => (
        <Text
          key={text}
          x={50}
          y={top + 15 + i * 13}
          fontSize={11.5}
          fontWeight="800"
          fill={WHITE}
          textAnchor="middle"
        >
          {text}
        </Text>
      ))}
    </>
  );
}
