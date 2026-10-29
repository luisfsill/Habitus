import { Circle, Ellipse, Path, Rect, Text } from "react-native-svg";

import { BLUSH, Cheeks, DotEyes, Drop, Frame, HappyEyes, Head, Heart, INK, Laugh, Line, outline, type StickerArt, WHITE, YELLOW } from "./parts";

// Expressive round faces, drawn on a 100×100 grid.
export const FACES: Record<string, StickerArt> = {
  feliz: ({ size }) => (
    <Frame size={size}>
      <Head />
      <DotEyes />
      <Cheeks />
      <Line d="M33 60 Q50 76 67 60" />
    </Frame>
  ),
  rindo: ({ size }) => (
    <Frame size={size}>
      <Head />
      <HappyEyes />
      <Laugh />
      <Drop x={20} y={46} s={0.8} />
      <Drop x={80} y={46} s={0.8} />
    </Frame>
  ),
  piscadinha: ({ size }) => (
    <Frame size={size}>
      <Head />
      <Ellipse cx={37} cy={44} rx={4.5} ry={6} fill={INK} />
      <Line d="M55 45 Q63 39 71 45" />
      <Cheeks />
      <Line d="M34 60 Q50 74 66 60" />
      <Path d="M54 66 Q60 76 64 64" fill={BLUSH} {...outline} strokeWidth={3} />
    </Frame>
  ),
  triste: ({ size }) => (
    <Frame size={size}>
      <Head />
      <Line d="M28 36 L42 32 M72 36 L58 32" width={3.5} />
      <DotEyes dy={2} />
      <Line d="M37 70 Q50 60 63 70" />
      <Drop x={64} y={60} s={0.7} />
    </Frame>
  ),
  bravo: ({ size }) => (
    <Frame size={size}>
      <Head fill="#FF8A65" />
      <Line d="M27 33 L44 41 M73 33 L56 41" width={5} />
      <DotEyes dy={4} />
      <Line d="M36 70 Q50 62 64 70" />
    </Frame>
  ),
  surpreso: ({ size }) => (
    <Frame size={size}>
      <Head />
      <Line d="M28 30 Q36 24 44 30 M56 30 Q64 24 72 30" width={3.5} />
      <Circle cx={37} cy={44} r={8} fill={WHITE} {...outline} strokeWidth={3} />
      <Circle cx={63} cy={44} r={8} fill={WHITE} {...outline} strokeWidth={3} />
      <Circle cx={37} cy={45} r={3.5} fill={INK} />
      <Circle cx={63} cy={45} r={3.5} fill={INK} />
      <Ellipse cx={50} cy={68} rx={7} ry={9} fill={INK} />
    </Frame>
  ),
  "legal-oculos": ({ size }) => (
    <Frame size={size}>
      <Head />
      <Rect x={21} y={36} width={26} height={16} rx={6} fill={INK} />
      <Rect x={53} y={36} width={26} height={16} rx={6} fill={INK} />
      <Line d="M47 41 H53 M21 40 L13 37 M79 40 L87 37" width={3.5} />
      <Line d="M27 40 L33 40" color={WHITE} width={2.5} />
      <Line d="M38 64 Q54 72 66 59" />
    </Frame>
  ),
  pensando: ({ size }) => (
    <Frame size={size}>
      <Head />
      <Line d="M54 30 Q62 25 70 29" width={3.5} />
      <DotEyes dx={3} dy={-1} />
      <Line d="M42 67 L60 63" />
      <Circle cx={34} cy={80} r={9} fill={YELLOW} {...outline} strokeWidth={3} />
      <Circle cx={80} cy={20} r={6} fill={WHITE} {...outline} strokeWidth={3} />
      <Circle cx={90} cy={8} r={4} fill={WHITE} {...outline} strokeWidth={2.5} />
    </Frame>
  ),
  sono: ({ size }) => (
    <Frame size={size}>
      <Head />
      <Line d="M29 46 Q37 50 45 46 M55 46 Q63 50 71 46" />
      <Ellipse cx={50} cy={67} rx={5} ry={6} fill={INK} />
      <Text x={74} y={28} fontSize={18} fontWeight="900" fill="#3D5A98" stroke={WHITE} strokeWidth={1}>
        Z
      </Text>
      <Text x={84} y={14} fontSize={12} fontWeight="900" fill="#3D5A98" stroke={WHITE} strokeWidth={1}>
        Z
      </Text>
    </Frame>
  ),
  abraco: ({ size }) => (
    <Frame size={size}>
      <Head />
      <HappyEyes />
      <Cheeks />
      <Line d="M38 59 Q50 70 62 59" />
      <Ellipse cx={26} cy={76} rx={11} ry={9} fill={YELLOW} {...outline} transform="rotate(-25 26 76)" />
      <Ellipse cx={74} cy={76} rx={11} ry={9} fill={YELLOW} {...outline} transform="rotate(25 74 76)" />
      <Heart x={84} y={14} s={0.26} />
      <Heart x={16} y={16} s={0.2} fill={BLUSH} />
    </Frame>
  ),
};
