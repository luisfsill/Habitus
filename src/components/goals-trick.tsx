import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { affirmationRanges, litAffirmations } from "@/domain/goals";
import { pinned, space } from "@/theme";

import { PrimaryButton } from "./primary-button";
import { SceneHint, SceneShell } from "./scene-shell";
import { PhraseWords, useSpokenText } from "./spoken-phrase";
import { VideoBackdrop } from "./video-backdrop";

const VIDEO = require("../../assets/videos/metas.mp4") as number;

interface Props {
  subtitle: string;
  title: string;
  affirmations: readonly string[];
  /** Where the declared days stand, before today's and after. */
  lineBefore: string;
  lineAfter: string;
  /** Already declared today when the screen opened: the goals show lit. */
  done: boolean;
  /** The browser can recognize the words; else only holding the goals. */
  canSpeak: boolean;
  listening: boolean;
  onListen: () => void;
  /** Everything the recognizer heard so far. */
  heard: string;
  /** Another affirmation was fully said (count lit so far). */
  onAffirmation: (lit: number) => void;
  /** The last word lit up: the tip is done. */
  onLit: () => void;
  onClose: () => void;
}

/** The lake's own fog, thickened over the video and lifting as the goals are said; the sun warms through at the end. */
function Mist({ clear }: { clear: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="lakeMist" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C9D2DC" stopOpacity={0.55} />
          <Stop offset="0.55" stopColor="#E4E9EE" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#C9D2DC" stopOpacity={0.7} />
        </LinearGradient>
        <RadialGradient id="sun" cx="50%" cy="58%" r="55%">
          <Stop offset="0" stopColor="#FFD58A" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFB45C" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#lakeMist)" opacity={0.8 * (1 - clear)} />
      <Rect width="100%" height="100%" fill="url(#sun)" opacity={clear} />
    </Svg>
  );
}

function hintFor(canSpeak: boolean, listening: boolean): string {
  if (!canSpeak) return "Diga cada meta em voz alta enquanto segura as frases. A névoa se abre com elas.";
  if (listening) return "Pode falar. Cada palavra acende quando você a diz, e a névoa se abre.";
  return "Na frente do espelho, toque em Falar as metas e diga cada uma em voz alta. Ou segure as frases enquanto lê.";
}

function Footer({ done, litNow, canSpeak, listening, onListen, onClose }: Pick<Props, "done" | "canSpeak" | "listening" | "onListen" | "onClose"> & { litNow: boolean }) {
  if (litNow) return <PrimaryButton label="Pronto" icon={{ ios: "sun.max.fill", android: "wb_sunny" }} glow onPress={onClose} />;
  if (done) return <PrimaryButton label="Concluída hoje ✓" disabled onPress={onClose} />;
  if (!canSpeak || listening) return null;
  return <PrimaryButton label="Falar as metas" icon={{ ios: "mic.fill", android: "record_voice_over" }} glow accessibilityHint="Liga o microfone: cada palavra acende quando você a diz" onPress={onListen} />;
}

/**
 * Metas em voz alta: the foggy lake at sunrise. Each affirmation lights up word by word as it is said (or while the
 * goals are held), the fog lifts with every word and the sun comes through at the last one (domain/goals.ts).
 */
export function GoalsTrick(props: Props) {
  const { subtitle, title, affirmations, lineBefore, lineAfter, done, canSpeak, listening, heard, onAffirmation, onLit } = props;
  const speech = useSpokenText(affirmations.join(" "), heard, done, onLit);
  const ranges = useMemo(() => affirmationRanges(affirmations), [affirmations]);
  const lit = litAffirmations(ranges, speech.words);
  const told = useRef(done ? ranges.length : 0);
  useEffect(() => {
    if (lit <= told.current) return;
    told.current = lit;
    onAffirmation(lit);
  }, [lit, onAffirmation]);
  const backdrop = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <VideoBackdrop source={VIDEO} />
      <Mist clear={speech.progress} />
    </View>
  );
  return (
    <SceneShell
      backdrop={backdrop}
      subtitle={subtitle}
      title={title}
      line={speech.finished ? lineAfter : lineBefore}
      footer={<Footer {...props} litNow={speech.lit} />}
    >
      <Pressable
        onPressIn={() => speech.hold(true)}
        onPressOut={() => speech.hold(false)}
        disabled={speech.finished}
        accessibilityRole="button"
        accessibilityLabel="Segurar as metas"
        accessibilityHint="Enquanto segura, as palavras das metas acendem"
        style={styles.goals}
      >
        {ranges.map(([from, to]) => (
          <PhraseWords key={from} timeline={speech.timeline} words={speech.words} from={from} to={to} variant="title3" />
        ))}
      </Pressable>
      {!speech.finished && <SceneHint>{hintFor(canSpeak, listening)}</SceneHint>}
      {!speech.finished && !listening && (
        <View style={styles.edit}>
          <PrimaryButton label="Editar afirmações" variant="plain" onPress={() => router.navigate("/settings/afirmacoes")} />
        </View>
      )}
    </SceneShell>
  );
}

const styles = StyleSheet.create({
  goals: { gap: space.xs, marginTop: space.sm, paddingVertical: space.sm },
  edit: { alignItems: "flex-start" },
});
