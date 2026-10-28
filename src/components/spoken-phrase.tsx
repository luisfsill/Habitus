import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { holdRate, holdStep, initialSpeech, litWords, msForWords, spokenWords, wordTimeline } from "@/domain/moon";

import { AppText } from "./app-text";

export const textShadow = { textShadowColor: "rgba(0,0,0,0.85)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } };

export type Timeline = ReturnType<typeof wordTimeline>;

/**
 * A text that lights up word by word: each word as it is said (`heard`, the recognizer's text, checked in order by
 * domain/moon.ts) or, while `hold(true)`, one every second or two from where the voice stopped. Calls `onLit` once
 * when the last word is lit; with `done` it starts lit.
 */
export function useSpokenText(text: string, heard: string, done: boolean, onLit: () => void) {
  const timeline = useMemo(() => wordTimeline(text), [text]);
  const total = timeline.at(-1)?.endMs ?? 1;
  const spokenMs = useMemo(() => (done ? 0 : msForWords(timeline, spokenWords(timeline, heard))), [done, timeline, heard]);
  const [held, setHeld] = useState(initialSpeech);
  const [holding, setHolding] = useState(false);
  const spoken = useRef(spokenMs);
  useEffect(() => {
    spoken.current = spokenMs;
  }, [spokenMs]);
  useEffect(() => {
    if (!holding) return;
    const step = () =>
      setHeld((s) => {
        const from = { ...s, ms: Math.max(s.ms, spoken.current) };
        return holdStep(from, Date.now(), holdRate(timeline, from.ms));
      });
    const id = setInterval(step, 33);
    return () => {
      clearInterval(id);
      // The next hold starts afresh, without the time let go counted.
      setHeld((s) => ({ ...s, at: null }));
    };
  }, [holding, timeline]);
  const ms = Math.max(held.ms, spokenMs);
  const lit = ms >= total;
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
  const finished = done || lit;
  return { timeline, finished, lit, progress: finished ? 1 : ms / total, words: finished ? timeline.length : litWords(timeline, ms), hold: setHolding };
}

interface WordsProps {
  timeline: Timeline;
  /** Words lit, counted over the whole timeline. */
  words: number;
  /** The part of the timeline to show, [from, to). */
  from?: number;
  to?: number;
  variant?: "title2" | "title3";
}

/** Part of a spoken text in quotes, its words lit up to `words`; read whole by screen readers. */
export function PhraseWords({ timeline, words, from = 0, to = timeline.length, variant = "title2" }: WordsProps) {
  const part = timeline.slice(from, to);
  return (
    <AppText variant={variant} style={styles.phrase} accessibilityLabel={part.map((w) => w.word).join(" ")}>
      {part.map((w, i) => (
        <Text key={i} style={[from + i < words ? styles.lit : styles.unlit, textShadow]}>
          {i ? ` ${w.word}` : `“${w.word}`}
          {i === part.length - 1 ? "”" : ""}
        </Text>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  phrase: { lineHeight: 34 },
  lit: { color: "#FFFFFF" },
  unlit: { color: "rgba(255,255,255,0.42)" },
});
