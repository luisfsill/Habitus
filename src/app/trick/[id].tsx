import { router, Stack, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Bonfire } from "@/components/bonfire";
import { CircularTimer } from "@/components/circular-timer";
import { FireFocus, type FirePhase } from "@/components/fire-focus";
import { FireIntro } from "@/components/fire-intro";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { VideoBackdrop } from "@/components/video-backdrop";
import { Icon } from "@/components/icon";
import { MAX_TEXT_LENGTH } from "@/domain/app-data";
import { trickDayKey } from "@/domain/bedtime";
import { dayKey } from "@/domain/time";
import { isTrickIndex, type Trick, TRICKS } from "@/domain/tricks";
import { playAmbient } from "@/services/sound";
import { useAppState } from "@/state/app-state";
import { useFire } from "@/state/use-fire";
import { radius, space, ThemePreferenceContext, type, useTheme } from "@/theme";

/** Foco total: the tip with the interactive bonfire. */
const FIRE = 3;
const FIRE_VIDEO = require("../../../assets/videos/fogueira.mp4") as number;
const FIRE_ORANGE = "#FF8A2A";
const FIRE_SECONDS = TRICKS[FIRE].durationSeconds ?? 120;

// Background videos of the tips that have a live scene so far (Pexels, see docs/design.md).
const SCENES: Partial<Record<number, number>> = {
  0: require("../../../assets/videos/sorria.mp4") as number,
  1: require("../../../assets/videos/postura.mp4") as number,
  2: require("../../../assets/videos/metas.mp4") as number,
};

function Phrase({ text }: { text: string }) {
  return (
    <View>
      <AppText variant="footnote" color="secondaryLabel" style={styles.label}>
        DIGA, DEVAGAR
      </AppText>
      <AppText variant="title1" color="accentText" style={styles.phrase} accessibilityRole="text">
        “{text}”
      </AppText>
    </View>
  );
}

function Affirmations() {
  const { data } = useAppState();
  return (
    <View>
      <AppText variant="footnote" color="secondaryLabel" style={styles.label}>
        SUAS AFIRMAÇÕES
      </AppText>
      {data.settings.affirmations.map((line, i) => (
        <AppText key={`${i}-${line}`} variant="title3" style={styles.affirmation}>
          “{line}”
        </AppText>
      ))}
      <View style={styles.inlineButton}>
        <PrimaryButton label="Editar afirmações" variant="plain" onPress={() => router.navigate("/settings")} />
      </View>
    </View>
  );
}

function Gratitude({ text, onChange, onCommit }: { text: string; onChange: (t: string) => void; onCommit: () => void }) {
  const { colors } = useTheme();
  return (
    <View>
      <AppText variant="footnote" color="secondaryLabel" style={styles.label} nativeID="gratitude-label">
        PELO QUE VOCÊ AGRADECE HOJE?
      </AppText>
      <TextInput
        value={text}
        onChangeText={onChange}
        onBlur={onCommit}
        placeholder="Obrigado por…"
        placeholderTextColor={colors.secondaryLabel}
        maxLength={MAX_TEXT_LENGTH}
        multiline
        accessibilityLabel="Frase de gratidão"
        accessibilityLabelledBy="gratitude-label"
        style={[type.body, styles.input, { color: colors.label, backgroundColor: colors.fill }]}
      />
    </View>
  );
}

interface PracticeProps {
  trick: Trick;
  gratitude: string;
  onGratitude: (t: string) => void;
  onCommitGratitude: () => void;
}

function Practice({ trick, gratitude, onGratitude, onCommitGratitude }: PracticeProps) {
  if (trick.kind === "timer" && trick.durationSeconds) {
    return (
      <View>
        <CircularTimer seconds={trick.durationSeconds} />
      </View>
    );
  }
  if (trick.kind === "affirmations") return <Affirmations />;
  if (trick.kind === "phrase" && trick.phrase) return <Phrase text={trick.phrase} />;
  if (trick.kind === "gratitude") {
    return <Gratitude text={gratitude} onChange={onGratitude} onCommit={onCommitGratitude} />;
  }
  return null;
}

/** "A ideia por trás". Over a video the grey text gets lost: white with a soft shadow instead. */
function Why({ text, overVideo }: { text: string; overVideo: boolean }) {
  const color = overVideo ? "label" : "secondaryLabel";
  return (
    <View>
      <AppText variant="footnote" color={color} style={[styles.label, overVideo && styles.overVideo]}>
        A IDEIA POR TRÁS
      </AppText>
      <AppText variant="body" color={color} style={overVideo && styles.overVideo}>
        {text}
      </AppText>
    </View>
  );
}

/** What plays behind the page: a tip's video, or nothing. Any backdrop means the dark theme. */
function backdropFor(index: number) {
  const scene = SCENES[index];
  return scene === undefined ? null : <VideoBackdrop source={scene} />;
}

/** Back to where the user came from; a trick opened by URL or notification has no history. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Finishing a tip: stops its background sound, saves it, and closes the screen once the celebration has played.
 * On Foco total the fire also listens for a blow once the timer is done; blowing it out finishes the tip.
 */
function useTrickFlow(index: number, gratitude: string) {
  const { completeTrick, setGratitude, celebration } = useAppState();
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    if (finishing && celebration === null) leave();
  }, [finishing, celebration]);
  const isFire = index === FIRE;
  const [firePhase, setFirePhase] = useState<FirePhase>("intro");
  // The scene's background sound loops until Concluir, or until the screen closes; the fire's waits for Iniciar.
  const soundOn = !isFire || firePhase !== "intro";
  const stopAmbient = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!isTrickIndex(index) || !soundOn) return;
    stopAmbient.current = playAmbient(index);
    return () => stopAmbient.current();
  }, [index, soundOn]);
  const finish = async () => {
    if (!isTrickIndex(index)) return;
    stopAmbient.current();
    if (TRICKS[index].kind === "gratitude") await setGratitude(gratitude);
    await completeTrick(index);
    setFinishing(true);
  };
  const [attempts, setAttempts] = useState(0);
  // Microphone and motion only after Iniciar: no permission prompt while the intro is being read.
  const fire = useFire(isFire && firePhase !== "intro", firePhase === "done", () => {
    setFirePhase("out");
    // The crackle stops with the flames.
    stopAmbient.current();
    // Let the flames die and the smoke rise before the screen closes.
    setTimeout(() => void finish(), 2200);
  }, setAttempts);
  return { finish, isFire, fire, firePhase, setFirePhase, attempts };
}

export default function TrickScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setGratitude } = useAppState();
  const { colors } = useTheme();
  const preference = useContext(ThemePreferenceContext);
  const index = Number(id);
  const [gratitude, setGratitudeText] = useState(data.gratitude[dayKey(new Date())] ?? "");
  const { finish, isFire, fire, firePhase, setFirePhase, attempts } = useTrickFlow(index, gratitude);

  if (!isTrickIndex(index)) {
    return (
      <Screen underHeader title="Dica não encontrada">
        <PrimaryButton label="Voltar" onPress={leave} />
      </Screen>
    );
  }

  const trick = TRICKS[index];
  const done = (data.completions[trickDayKey(index, new Date())] ?? []).includes(index);

  // Foco total: the intro over the still fire, then nothing but the fire and a small timer.
  if (isFire) {
    return (
      <ThemePreferenceContext.Provider value="dark">
        {/* The back arrow in the fire's ember orange instead of the app's blue. */}
        <Stack.Screen options={{ headerTintColor: FIRE_ORANGE }} />
        <Screen underHeader backdrop={<Bonfire source={FIRE_VIDEO} input={fire} out={firePhase === "out"} playing={firePhase !== "intro"} />}>
          {firePhase === "intro" ? (
            <FireIntro
              subtitle={`Dica ${index + 1} de ${TRICKS.length}`}
              title={trick.title}
              instruction={trick.instruction}
              why={trick.why}
              onStarted={() => setFirePhase("running")}
            />
          ) : (
            <FireFocus phase={firePhase} seconds={FIRE_SECONDS} onTimerEnd={() => setFirePhase("done")} attempts={attempts} />
          )}
        </Screen>
      </ThemePreferenceContext.Provider>
    );
  }
  // Tips with a live scene: a video behind the page, always in the dark theme so the text reads over it.
  const backdrop = backdropFor(index);
  const dark = backdrop !== null;
  return (
    <ThemePreferenceContext.Provider value={dark ? "dark" : preference}>
    <Screen
      underHeader
      backdrop={backdrop}
      subtitle={`Dica ${index + 1} de ${TRICKS.length}`}
      title={trick.title}
      footer={
        <PrimaryButton
          label={done ? "Concluída hoje ✓" : "Concluir"}
          disabled={done}
          accessibilityHint="Marca esta dica como feita hoje"
          onPress={() => void finish()}
        />
      }>
      {!dark && (
        <View style={[styles.hero, { backgroundColor: colors.accentSoft }]}>
          <Icon ios={trick.symbol.ios} android={trick.symbol.android} size={44} color={colors.accent} />
        </View>
      )}
      <AppText variant="title3" style={styles.instruction}>
        {trick.instruction}
      </AppText>
      <Practice
        trick={trick}
        gratitude={gratitude}
        onGratitude={setGratitudeText}
        onCommitGratitude={() => void setGratitude(gratitude)}
      />
      {trick.why && <Why text={trick.why} overVideo={dark} />}
    </Screen>
    </ThemePreferenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  overVideo: { textShadowColor: "rgba(0,0,0,0.75)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  hero: { width: 88, height: 88, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  instruction: { fontWeight: "400", lineHeight: 28 },
  label: { fontWeight: "600", letterSpacing: 0.5, marginBottom: space.sm },
  affirmation: { marginVertical: space.xs },
  phrase: { lineHeight: 38, marginVertical: space.sm },
  inlineButton: { marginTop: space.sm, alignItems: "flex-start" },
  input: { minHeight: 96, borderRadius: radius.md, padding: space.md, textAlignVertical: "top" },
});
