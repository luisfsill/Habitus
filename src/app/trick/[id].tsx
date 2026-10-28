import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { Bonfire } from "@/components/bonfire";
import { FireFocus, type FirePhase } from "@/components/fire-focus";
import { FireIntro } from "@/components/fire-intro";
import { GoalsTrick } from "@/components/goals-trick";
import { MoonTrick } from "@/components/moon-trick";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { SkyTrick } from "@/components/sky-trick";
import { SmileTrick } from "@/components/smile-trick";
import { SummitTrick } from "@/components/summit-trick";
import { trickDayKey } from "@/domain/bedtime";
import { flowersOf, gardenLine } from "@/domain/garden";
import { declaredDays, goalsLine } from "@/domain/goals";
import { beforeTonight, litFraction, type Moon, MOON_NIGHTS, moonLine, moonOf, nextNight } from "@/domain/moon";
import { closesConstellation, skyOf } from "@/domain/sky";
import { altitudeOf, METERS_PER_SESSION, peakAt, summitLine } from "@/domain/summit";
import { dayKey } from "@/domain/time";
import { BEDTIME_TRICK, isTrickIndex, type Trick, type TrickIndex, TRICKS } from "@/domain/tricks";
import { playAmbient, playMoonLit, playStarBorn } from "@/services/sound";
import { useAppState } from "@/state/app-state";
import { useFire } from "@/state/use-fire";
import { useShake } from "@/state/use-shake";
import { useSmile } from "@/state/use-smile";
import { useWords } from "@/state/use-words";
import { ThemePreferenceContext } from "@/theme";

/** Foco total: the tip with the interactive bonfire. */
const FIRE = 3;
const FIRE_VIDEO = require("../../../assets/videos/fogueira.mp4") as number;
const FIRE_ORANGE = "#FF8A2A";
const FIRE_SECONDS = TRICKS[FIRE].durationSeconds ?? 120;

const MOONLIGHT = "#E6E9F5";

/** Freezes a count when the screen opens: finishing today must not move the starting point under the animation. */
function useAtOpen<T>(make: () => T): T {
  const [value] = useState(make);
  return value;
}

/** Metas em voz alta: each affirmation said lifts the lake's fog (goals-trick.tsx, domain/goals.ts). */
function GoalsScene({ trick, done }: { trick: Trick; done: boolean }) {
  const { data, completeTrick } = useAppState();
  const { days, doneAtOpen } = useAtOpen(() => ({ days: declaredDays(data.completions), doneAtOpen: done }));
  const words = useWords();
  return (
    <GoalsTrick
      subtitle={`Dica ${trick.index + 1} de ${TRICKS.length}`}
      title={trick.title}
      affirmations={data.settings.affirmations}
      lineBefore={goalsLine(days, false)}
      lineAfter={goalsLine(doneAtOpen ? days : days + 1, !doneAtOpen)}
      done={doneAtOpen}
      canSpeak={words.canSpeak}
      listening={words.listening}
      onListen={words.listen}
      heard={words.heard}
      onAffirmation={() => playStarBorn(false)}
      onLit={() => {
        words.stop();
        void completeTrick(trick.index);
      }}
      onClose={leave}
    />
  );
}

/** Postura de poder: two minutes standing firm climb the person's mountains (summit-trick.tsx, domain/summit.ts). */
function SummitScene({ trick, done }: { trick: Trick; done: boolean }) {
  const { data, completeTrick } = useAppState();
  const { altitude, doneAtOpen } = useAtOpen(() => ({ altitude: altitudeOf(data.completions), doneAtOpen: done }));
  const motion = useShake();
  const after = doneAtOpen ? altitude : altitude + METERS_PER_SESSION;
  return (
    <SummitTrick
      subtitle={`Dica ${trick.index + 1} de ${TRICKS.length}`}
      title={trick.title}
      instruction={trick.instruction}
      why={trick.why}
      seconds={trick.durationSeconds ?? 120}
      lineBefore={summitLine(altitude, altitude)}
      lineAfter={summitLine(doneAtOpen ? after : altitude, after)}
      done={doneAtOpen}
      shake={motion.shake}
      onStart={motion.start}
      onDone={() => {
        playStarBorn(peakAt(after) !== peakAt(altitude));
        void completeTrick(trick.index);
      }}
      onClose={leave}
    />
  );
}

/** Sorria: the smile raises the sun and plants a flower (smile-trick.tsx, domain/garden.ts). */
function SmileScene({ trick, done }: { trick: Trick; done: boolean }) {
  const { data, completeTrick } = useAppState();
  const { flowers, doneAtOpen } = useAtOpen(() => ({ flowers: flowersOf(data.completions), doneAtOpen: done }));
  const camera = useSmile();
  // Already smiled today: the meadow counts today's flower in `flowers`.
  const before = doneAtOpen ? flowers - 1 : flowers;
  return (
    <SmileTrick
      subtitle={`Dica ${trick.index + 1} de ${TRICKS.length}`}
      title={trick.title}
      instruction={trick.instruction}
      why={trick.why}
      flowers={Math.max(before, 0)}
      lineBefore={gardenLine(before, false)}
      lineAfter={gardenLine(before + 1, !doneAtOpen)}
      done={doneAtOpen}
      canSee={camera.canSee}
      watching={camera.watching}
      score={camera.score}
      onWatch={camera.start}
      onLit={() => {
        camera.stop();
        void completeTrick(trick.index);
      }}
      onClose={leave}
    />
  );
}

/** Moon state for the screen: lit part, its line and whether it is full. */
function moonView(moon: Moon) {
  return { lit: litFraction(moon.phase), line: moonLine(moon), full: moon.phase === MOON_NIGHTS };
}

/** Antes de dormir: the phrase fills tonight's phase of the person's moon (moon-trick.tsx, domain/moon.ts). */
function BedtimeTrick({ trick, done }: { trick: Trick; done: boolean }) {
  const { data, completeTrick } = useAppState();
  const { moon, doneAtOpen } = useAtOpen(() => ({ moon: moonOf(data.completions), doneAtOpen: done }));
  const words = useWords();
  const after = doneAtOpen ? moon : nextNight(moon);
  return (
    <ThemePreferenceContext.Provider value="dark">
      <Stack.Screen options={{ headerTintColor: MOONLIGHT }} />
      <MoonTrick
        subtitle={`Dica ${trick.index + 1} de ${TRICKS.length}`}
        title={trick.title}
        phrase={trick.phrase ?? ""}
        before={moonView(doneAtOpen ? moon : beforeTonight(moon))}
        after={moonView(after)}
        done={doneAtOpen}
        canSpeak={words.canSpeak}
        listening={words.listening}
        onListen={words.listen}
        heard={words.heard}
        onLit={() => {
          words.stop();
          playMoonLit(after.phase === MOON_NIGHTS);
          void completeTrick(BEDTIME_TRICK);
        }}
        onClose={leave}
      />
    </ThemePreferenceContext.Provider>
  );
}

/** The tip is done today. In development never: every scene can be replayed, and finishing again adds nothing (withCompletion skips a repeat). */
function doneToday(completions: Readonly<Record<string, readonly number[]>>, index: TrickIndex): boolean {
  return !__DEV__ && (completions[trickDayKey(index, new Date())] ?? []).includes(index);
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
  const done = doneToday(data.completions, index);

  if (index === BEDTIME_TRICK) return <BedtimeTrick trick={trick} done={done} />;
  // Foco total: the intro over the still fire, then nothing but the fire and a small timer.
  if (isFire) {
    return (
      <ThemePreferenceContext.Provider value="dark">
        {/* The back arrow in the fire's ember orange instead of the app's blue. */}
        <Stack.Screen options={{ headerTintColor: FIRE_ORANGE }} />
        <Screen underHeader dense backdrop={<Bonfire source={FIRE_VIDEO} input={fire} out={firePhase === "out"} playing={firePhase !== "intro"} />}>
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
  // Gratidão antecipada: the phrase becomes today's star in the person's gratitude sky.
  if (trick.kind === "gratitude") {
    return (
      <ThemePreferenceContext.Provider value="dark">
        <SkyTrick
          subtitle={`Dica ${index + 1} de ${TRICKS.length}`}
          title={trick.title}
          instruction={trick.instruction}
          why={trick.why}
          sky={skyOf(data.gratitude)}
          today={dayKey(new Date())}
          text={gratitude}
          onChangeText={setGratitudeText}
          onLight={async () => {
            // A first phrase today adds a star; rewriting today's phrase only lights the same one again.
            const added = !(dayKey(new Date()) in data.gratitude);
            const stars = skyOf(data.gratitude).stars.length;
            await setGratitude(gratitude);
            playStarBorn(added && closesConstellation(stars + 1));
          }}
          done={done}
          onFinish={() => void finish()}
        />
      </ThemePreferenceContext.Provider>
    );
  }
  if (index === 2) return <ThemePreferenceContext.Provider value="dark"><GoalsScene trick={trick} done={done} /></ThemePreferenceContext.Provider>;
  if (index === 1) return <ThemePreferenceContext.Provider value="dark"><SummitScene trick={trick} done={done} /></ThemePreferenceContext.Provider>;
  return <ThemePreferenceContext.Provider value="dark"><SmileScene trick={trick} done={done} /></ThemePreferenceContext.Provider>;
}
