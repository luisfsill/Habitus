import { Circle, Ellipse, G, Path, Rect, Text } from "react-native-svg";

import { Caption, Disc, Drop, Frame, Heart, INK, Line, outline, type StickerArt, TEAR, WHITE, YELLOW } from "./parts";

/** An open palm with four fingers and a thumb, centered on (x, y). */
function Hand({ x, y, turn, flip = false }: { x: number; y: number; turn: number; flip?: boolean }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${turn}) scale(${flip ? -1 : 1} 1)`}>
      <Ellipse cx={-15} cy={4} rx={5} ry={10} fill={YELLOW} {...outline} strokeWidth={3} transform="rotate(-30 -15 4)" />
      {[-11, -4, 3, 10].map((fx) => (
        <Rect key={fx} x={fx - 3.5} y={fx === -11 || fx === 10 ? -22 : -27} width={7} height={26} rx={3.5} fill={YELLOW} {...outline} strokeWidth={3} />
      ))}
      <Rect x={-14} y={-6} width={28} height={28} rx={10} fill={YELLOW} {...outline} strokeWidth={3} />
    </G>
  );
}

// Gestures, symbols and the app's own reminders (captioned), drawn on a 100×100 grid.
export const THINGS: Record<string, StickerArt> = {
  joinha: ({ size }) => (
    <Frame size={size}>
      <Disc fill="#CDEBFF" />
      <Rect x={20} y={48} width={16} height={36} rx={4} fill="#3D7BD9" {...outline} />
      <Path d="M36 48 L46 22 Q49 13 57 17 Q63 21 60 31 L57 46 H70 Q78 46 76 54 L72 80 Q71 84 66 84 H36 Z" fill={YELLOW} {...outline} />
      <Line d="M58 58 H75 M58 68 H73 M57 77 H70" width={3} />
    </Frame>
  ),
  palmas: ({ size }) => (
    <Frame size={size}>
      <Disc fill="#FFE3C2" />
      <Hand x={34} y={58} turn={-14} />
      <Hand x={66} y={58} turn={14} flip />
      <Line d="M24 30 L30 37 M50 16 V26 M76 30 L70 37" width={3.5} />
    </Frame>
  ),
  coracao: ({ size }) => (
    <Frame size={size}>
      <Disc fill="#FFD6DE" />
      <Heart x={50} y={52} s={1.4} />
      <Ellipse cx={36} cy={42} rx={6} ry={4} fill={WHITE} opacity={0.6} transform="rotate(-35 36 42)" />
    </Frame>
  ),
  flor: ({ size }) => (
    <Frame size={size}>
      <Disc fill="#D8F5D0" />
      <Line d="M50 54 Q48 70 50 86" color="#2E8B57" width={5} />
      <Ellipse cx={62} cy={74} rx={9} ry={5} fill="#5CC46B" {...outline} strokeWidth={3} transform="rotate(-30 62 74)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <Circle key={a} cx={50} cy={26} r={11} fill="#FF8FB8" {...outline} strokeWidth={3} transform={`rotate(${a} 50 42)`} />
      ))}
      <Circle cx={50} cy={42} r={9} fill={YELLOW} {...outline} strokeWidth={3} />
    </Frame>
  ),
  "bebe-agua": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#D6F0FF" />
      <Path d="M32 16 H64 L59 58 Q58 62 54 62 H42 Q38 62 37 58 Z" fill={WHITE} {...outline} />
      <Path d="M35 34 H61 L58.5 56 Q58 59 54 59 H42 Q38 59 37.5 56 Z" fill={TEAR} />
      <Drop x={74} y={30} s={1.2} />
      <Caption lines={["Bebe água!"]} fill="#1E88E5" />
    </Frame>
  ),
  "cade-sequencia": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#FFE7CC" />
      <Path
        d="M50 8 C62 20 70 28 68 41 C66 51 59 55 50 55 C41 55 33 51 31 41 C29 31 38 26 40 16 C44 24 46 26 48 28 C50 20 50 14 50 8 Z"
        fill="#FF7A1A"
        {...outline}
      />
      <Text x={50} y={50} fontSize={24} fontWeight="900" fill={WHITE} stroke={INK} strokeWidth={1.5} textAnchor="middle">
        ?
      </Text>
      <Caption lines={["Cadê sua", "sequência?"]} fill="#E8590C" />
    </Frame>
  ),
  "bora-meditar": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#EDE3FF" />
      <Path d="M50 54 C36 52 26 42 22 30 C36 32 46 40 50 54 Z" fill="#C9A7FF" {...outline} strokeWidth={3} />
      <Path d="M50 54 C64 52 74 42 78 30 C64 32 54 40 50 54 Z" fill="#C9A7FF" {...outline} strokeWidth={3} />
      <Path d="M50 12 C61 24 61 42 50 54 C39 42 39 24 50 12 Z" fill="#A779F2" {...outline} strokeWidth={3} />
      <Caption lines={["Bora", "meditar?"]} fill="#7048C8" />
    </Frame>
  ),
  "hora-de-dormir": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#DCE3F7" />
      <Path d="M56 12 A22 22 0 1 0 72 50 A18 18 0 1 1 56 12 Z" fill={YELLOW} {...outline} />
      <Text x={70} y={30} fontSize={14} fontWeight="900" fill="#3D5A98">
        Z
      </Text>
      <Caption lines={["Hora de", "dormir"]} fill="#3D5A98" />
    </Frame>
  ),
  "mandou-bem": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#FFF3C4" />
      <Path
        d="M50 12 L56.5 30 L75.5 30.6 L60.5 42.4 L65.7 60.6 L50 50 L34.3 60.6 L39.5 42.4 L24.5 30.6 L43.5 30 Z"
        fill={YELLOW}
        {...outline}
      />
      <Line d="M18 18 L22 22 M82 18 L78 22 M86 42 H80 M14 42 H20" color="#F4A100" width={3.5} />
      <Caption lines={["Mandou", "bem!"]} fill="#2EAD5B" />
    </Frame>
  ),
  "respira-fundo": ({ size }) => (
    <Frame size={size}>
      <Disc fill="#D3F4EF" />
      <Line d="M20 26 H56 A8 8 0 1 0 48 18" color="#138A7E" width={5} />
      <Line d="M16 40 H66 A9 9 0 1 1 57 49" color="#138A7E" width={5} />
      <Line d="M26 52 H44" color="#138A7E" width={5} />
      <Caption lines={["Respira", "fundo"]} fill="#138A7E" />
    </Frame>
  ),
};
