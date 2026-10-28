import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { initialSpeech, litWords, speechStep, wordTimeline } from "@/domain/moon";
import { pinned, space, useColumnGutter } from "@/theme";

import { AppText } from "./app-text";
import { MoonScene, sceneLayout } from "./moon-scene";
import { PrimaryButton } from "./primary-button";

/** Height of the transparent stack header above the moon. */
const HEADER = Platform.select({ ios: 44, default: 56 });
const SILVER = "#E6E9F5";
const shadow = { textShadowColor: "rgba(0,0,0,0.85)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } };

interface MoonState {
  /** Lit part of the disc, 0…1. */
  lit: number;
  /** "Lua 2 · noite 5 de 8". */
  line: string;
  full: boolean;
}

interface Props {
  subtitle: string;
  title: string;
  phrase: string;
  /** The moon before tonight's phrase and after it; the same both when tonight is already done. */
  before: MoonState;
  after: MoonState;
  /** Tonight was already done when the screen opened: the phrase shows lit and the moon in its phase. */
  done: boolean;
  /** The microphone can follow the voice (web); without it only holding the moon lights the phrase. */
  canSpeak: boolean;
  listening: boolean;
  onListen: () => void;
  /** Live microphone level, 0…1. */
  voice: RefObject<number>;
  /** The last word lit up: tonight's phase is filled. */
  onLit: () => void;
  onClose: () => void;
}

/** What to do, under the phrase. */
function hintFor(canSpeak: boolean, listening: boolean): string {
  if (!canSpeak) return "Segure a lua enquanto diz a frase, devagar.";
  if (listening) return "Pode falar. As palavras acendem com a sua voz; se preferir, segure a lua.";
  return "Toque em Falar a frase e diga devagar, em voz alta. Ou segure a lua enquanto lê.";
}

/**
 * Speaking time lit so far: steps ~30 times a second while the voice or a finger can light the phrase. Calls `onLit`
 * once when it reaches `total` (the last word).
 */
function useSpeech(running: boolean, voice: RefObject<number>, total: number, onLit: () => void) {
  const [speech, setSpeech] = useState(initialSpeech);
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const active = running || holding;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSpeech((s) => speechStep(s, Date.now(), voice.current, holdingRef.current)), 33);
    return () => clearInterval(id);
  }, [active, voice]);
  const lit = speech.ms >= total;
  const onLitRef = useRef(onLit);
  const called = useRef(false);
  useEffect(() => {
    onLitRef.current = onLit;
  }, [onLit]);
  useEffect(() => {
    if (!lit || called.current) return;
    called.current = true;
    onLitRef.current();
  }, [lit]);
  const hold = (on: boolean) => {
    holdingRef.current = on;
    setHolding(on);
  };
  return { ms: speech.ms, lit, hold };
}

/** Before: Falar a frase (when the microphone can listen). After tonight's phrase: Boa noite. */
function Footer({ done, litNow, canSpeak, listening, onListen, onClose }: Pick<Props, "done" | "canSpeak" | "listening" | "onListen" | "onClose"> & { litNow: boolean }) {
  if (litNow) return <PrimaryButton label="Boa noite" icon={{ ios: "moon.stars.fill", android: "bedtime" }} glow onPress={onClose} />;
  if (done) return <PrimaryButton label="Concluída hoje ✓" disabled onPress={onClose} />;
  if (!canSpeak || listening) return null;
  return (
    <PrimaryButton label="Falar a frase" icon={{ ios: "mic.fill", android: "record_voice_over" }} glow accessibilityHint="Liga o microfone para as palavras acenderem com a sua voz" onPress={onListen} />
  );
}

/** The phrase, its words lit up to `words`; read whole by screen readers. */
function PhraseWords({ phrase, timeline, words }: { phrase: string; timeline: { word: string }[]; words: number }) {
  return (
    <AppText variant="title2" style={styles.phrase} accessibilityLabel={phrase}>
      {timeline.map((w, i) => (
        <Text key={i} style={i < words ? [styles.lit, shadow] : styles.unlit}>
          {i ? ` ${w.word}` : `“${w.word}`}
          {i === timeline.length - 1 ? "”" : ""}
        </Text>
      ))}
    </AppText>
  );
}

/** The words under the moon: the tip, where the moon stands, the phrase and, until it is lit, what to do. */
function MoonCopy(props: Props & { finished: boolean; timeline: { word: string }[]; words: number }) {
  const { subtitle, title, phrase, before, after, canSpeak, listening, finished, timeline, words } = props;
  return (
    <>
      <AppText variant="subheadline" style={[styles.dim, shadow]}>
        {subtitle}
      </AppText>
      <AppText variant="title1" accessibilityRole="header" style={shadow}>
        {title}
      </AppText>
      <AppText variant="footnote" style={[styles.line, shadow]} accessibilityLiveRegion="polite">
        {finished ? after.line : before.line}
      </AppText>
      <PhraseWords phrase={phrase} timeline={timeline} words={words} />
      {!finished && (
        <AppText variant="footnote" style={[styles.dim, shadow]}>
          {hintFor(canSpeak, listening)}
        </AppText>
      )}
    </>
  );
}

/**
 * Antes de dormir: the night sea with the person's moon (moon-scene.tsx). The phrase lights up word by word while
 * they speak it (web microphone) or hold the moon, and the moon fills to tonight's phase with it; the last word
 * finishes the tip (rules in domain/moon.ts).
 */
export function MoonTrick(props: Props) {
  const { phrase, before, after, done, listening, voice, onLit } = props;
  const insets = useSafeAreaInsets();
  const gutter = useColumnGutter();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const timeline = useMemo(() => wordTimeline(phrase), [phrase]);
  const total = timeline.at(-1)?.endMs ?? 1;
  const speech = useSpeech(listening && !done, voice, total, onLit);
  const finished = done || speech.lit;
  const progress = finished ? 1 : speech.ms / total;
  const lit = done ? after.lit : before.lit + (after.lit - before.lit) * progress;
  const layout = size && sceneLayout(size.width, size.height, insets.top + HEADER + space.md);
  return (
    <View style={[StyleSheet.absoluteFill, pinned, styles.root]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {layout && (
        <>
          <MoonScene layout={layout} lit={lit} bloom={speech.lit ? 1 : 0} full={speech.lit && after.full} />
          <Pressable
            onPressIn={() => speech.hold(true)}
            onPressOut={() => speech.hold(false)}
            disabled={finished}
            accessibilityRole="button"
            accessibilityLabel="Segurar a lua"
            accessibilityHint="Enquanto segura, as palavras da frase acendem"
            style={[styles.hold, { left: layout.moon.x - layout.moon.r * 2, top: layout.moon.y - layout.moon.r * 2, width: layout.moon.r * 4, height: layout.moon.r * 4 }]}
          />
          <View pointerEvents="box-none" style={[styles.text, { top: layout.moon.y + layout.moon.r * 2.4, left: gutter + space.xl, right: gutter + space.xl }]}>
            <MoonCopy {...props} finished={finished} timeline={timeline} words={finished ? timeline.length : litWords(timeline, speech.ms)} />
          </View>
        </>
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg, paddingHorizontal: gutter + space.xl }]}>
        <Footer {...props} litNow={speech.lit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#04060E" },
  hold: { position: "absolute", borderRadius: 999 },
  text: { position: "absolute", gap: space.sm },
  dim: { color: "rgba(235,238,250,0.72)" },
  line: { color: SILVER, fontWeight: "600", letterSpacing: 0.3 },
  phrase: { lineHeight: 34, marginTop: space.sm },
  lit: { color: "#FFFFFF" },
  unlit: { color: "rgba(255,255,255,0.28)" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
