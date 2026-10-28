import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, space, useColumnGutter } from "@/theme";

import { AppText } from "./app-text";
import { MoonScene, sceneLayout } from "./moon-scene";
import { PrimaryButton } from "./primary-button";
import { PhraseWords, textShadow as shadow, type Timeline, useSpokenText } from "./spoken-phrase";

/** Height of the transparent stack header above the moon. */
const HEADER = Platform.select({ ios: 44, default: 56 });
const SILVER = "#E6E9F5";

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
  /** The browser can recognize the words (online, not Firefox, not the native app); else only holding the moon. */
  canSpeak: boolean;
  listening: boolean;
  onListen: () => void;
  /** Everything the recognizer heard so far. */
  heard: string;
  /** The last word lit up: tonight's phase is filled. */
  onLit: () => void;
  onClose: () => void;
}

/** What to do, under the phrase. */
function hintFor(canSpeak: boolean, listening: boolean): string {
  if (!canSpeak) return "Segure a lua enquanto diz a frase, devagar.";
  if (listening) return "Pode falar, devagar. Cada palavra acende quando você a diz; se preferir, segure a lua.";
  return "Toque em Falar a frase e diga palavra por palavra. Ou segure a lua enquanto lê.";
}

/** Before: Falar a frase (when the microphone can listen). After tonight's phrase: Boa noite. */
function Footer({ done, litNow, canSpeak, listening, onListen, onClose }: Pick<Props, "done" | "canSpeak" | "listening" | "onListen" | "onClose"> & { litNow: boolean }) {
  if (litNow) return <PrimaryButton label="Boa noite" icon={{ ios: "moon.stars.fill", android: "bedtime" }} glow onPress={onClose} />;
  if (done) return <PrimaryButton label="Concluída hoje ✓" disabled onPress={onClose} />;
  if (!canSpeak || listening) return null;
  return (
    <PrimaryButton label="Falar a frase" icon={{ ios: "mic.fill", android: "record_voice_over" }} glow accessibilityHint="Liga o microfone: cada palavra acende quando você a diz" onPress={onListen} />
  );
}

/** The words under the moon: the tip, where the moon stands, the phrase and, until it is lit, what to do. */
function MoonCopy(props: Props & { finished: boolean; timeline: Timeline; words: number }) {
  const { subtitle, title, before, after, canSpeak, listening, finished, timeline, words } = props;
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
      <View style={styles.phrase}>
        <PhraseWords timeline={timeline} words={words} />
      </View>
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
  const { phrase, before, after, done, heard, onLit } = props;
  const insets = useSafeAreaInsets();
  const gutter = useColumnGutter();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const speech = useSpokenText(phrase, heard, done, onLit);
  const { finished, timeline } = speech;
  const lit = done ? after.lit : before.lit + (after.lit - before.lit) * speech.progress;
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
            <MoonCopy {...props} finished={finished} timeline={timeline} words={speech.words} />
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
  phrase: { marginTop: space.sm },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
