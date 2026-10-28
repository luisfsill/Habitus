import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { CONSTELLATION_DAYS, constellationName, CONSTELLATIONS, type Sky, SKY_DAYS, starDate } from "@/domain/sky";
import { MAX_WIDTH, pinned, radius, space } from "@/theme";

import { AppText } from "./app-text";
import { GratitudePhrase } from "./gratitude-phrase";
import { HeaderButton } from "./header-button";
import { GratitudeSky } from "./gratitude-sky";
import { PrimaryButton } from "./primary-button";
import { Screen } from "./screen";

interface Props {
  subtitle: string;
  title: string;
  instruction: string;
  why?: string;
  sky: Sky;
  /** dayKey of today: its star is the one lit by this screen. */
  today: string;
  text: string;
  onChangeText: (text: string) => void;
  /** Saves today's phrase; its star then shows up in `sky`. */
  onLight: () => Promise<void>;
  /** The tip is already done today. */
  done: boolean;
  onFinish: () => void;
}

/** Where the year stands: the constellation today's star just closed, the next one, or the full sky. */
function progressLine(sky: Sky, born: boolean): string {
  if (sky.complete) return "Céu completo: um ano inteiro de gratidão.";
  if (born && sky.nextIn === CONSTELLATION_DAYS && sky.constellations > 0)
    return `Nova constelação: ${constellationName(sky, sky.stars.length - 1) ?? ""}! São ${sky.constellations} de ${CONSTELLATIONS}.`;
  return `Próxima constelação em ${sky.nextIn} ${sky.nextIn === 1 ? "dia" : "dias"}.`;
}

/** The phrase of a tapped star, or how to read one. */
function StarCard({ sky, selected }: { sky: Sky; selected: number | null }) {
  const star = selected === null ? undefined : sky.stars[selected];
  const figure = selected === null ? undefined : constellationName(sky, selected);
  if (!star) {
    return (
      <AppText variant="footnote" color="secondaryLabel" align="center" style={styles.shadow}>
        Toque numa estrela para ler a frase daquele dia.
      </AppText>
    );
  }
  return (
    <Animated.View key={star.day} entering={FadeIn.duration(300)} style={styles.card} accessibilityLiveRegion="polite">
      <AppText variant="footnote" color="secondaryLabel">
        {figure ? `${starDate(star.day)} · ${figure}` : starDate(star.day)}
      </AppText>
      <AppText variant="body">“{star.text}”</AppText>
    </Animated.View>
  );
}

/** After lighting today's star: Concluir. Only looking (peek): back to writing today's phrase. */
function SkyFooter({ lit, done, onFinish, onWrite }: { lit: boolean; done: boolean; onFinish: () => void; onWrite: () => void }) {
  if (!lit) return <PrimaryButton label="Escrever a frase de hoje" icon={{ ios: "sparkles", android: "auto_awesome" }} glow onPress={onWrite} />;
  return <PrimaryButton label={done ? "Concluída hoje ✓" : "Concluir"} disabled={done} accessibilityHint="Marca esta dica como feita hoje" onPress={onFinish} />;
}

/**
 * Gratidão antecipada: the phrase is written over a veil on the night sky; Acender estrela saves it, the veil lifts
 * and today's star is born in the person's gratitude sky (domain/sky.ts), where a tap on any star reads its phrase.
 * Concluir finishes the tip. Opened again on a day it is done, the screen goes straight to the sky; on other days
 * "Ver meu céu" shows the sky before writing (peek), with a way back to today's phrase.
 */
export function SkyTrick({ subtitle, title, instruction, why, sky, today, text, onChangeText, onLight, done, onFinish }: Props) {
  const [lit, setLit] = useState(done);
  const [peek, setPeek] = useState(false);
  // The veil fades back in only on the way back from the sky: on the web an entering fade on first mount stays clear.
  const [peeked, setPeeked] = useState(false);
  const [born, setBorn] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Without a phrase the button shakes instead of looking switched off.
  const [shake, setShake] = useState(0);
  const light = async () => {
    setSaving(true);
    await onLight();
    setSaving(false);
    setLit(true);
    setBorn(true);
    // Today's star takes the stage: a star picked while peeking earlier would hide the new constellation.
    setSelected(null);
  };
  const open = lit || peek;
  const todayIndex = sky.stars.findIndex((s) => s.day === today);
  const backdrop = <GratitudeSky stars={sky.stars} lines={sky.lines} born={born && todayIndex >= 0 ? todayIndex : null} selected={open ? selected : null} onSelect={open ? setSelected : undefined} />;

  if (!open) {
    return (
      <Screen
        underHeader
        dense
        backdrop={backdrop}
        subtitle={subtitle}
        title={title}
        footer={
          <PrimaryButton
            label="Acender estrela"
            icon={{ ios: "sparkles", android: "auto_awesome" }}
            glow
            shake={shake}
            loading={saving}
            accessibilityHint="Guarda a frase e acende a estrela de hoje no seu céu"
            onPress={() => (text.trim() ? void light() : setShake((n) => n + 1))}
          />
        }
      >
        <Animated.View pointerEvents="none" entering={peeked ? FadeIn.duration(500) : undefined} exiting={FadeOut.duration(900)} style={[StyleSheet.absoluteFill, pinned, styles.veil]} />
        {/* Top right, in line with the back arrow: the sky so far, before writing today's phrase. */}
        <Stack.Screen
          options={{
            headerRight: () =>
              sky.stars.length > 0 && (
                <HeaderButton
                  label="Ver meu céu"
                  icon={{ ios: "moon.stars.fill", android: "bedtime" }}
                  onPress={() => {
                    setPeek(true);
                    setPeeked(true);
                  }}
                />
              ),
          }}
        />
        <AppText variant="title3" style={styles.instruction}>
          {instruction}
        </AppText>
        {why && (
          <View>
            <AppText variant="footnote" color="secondaryLabel" style={styles.label}>
              A IDEIA POR TRÁS
            </AppText>
            <AppText variant="subheadline" color="secondaryLabel">
              {why}
            </AppText>
          </View>
        )}
        <GratitudePhrase text={text} onChangeText={onChangeText} />
      </Screen>
    );
  }

  const year = sky.year > 1 ? ` · ano ${sky.year}` : "";
  return (
    <Screen
      underHeader
      dense
      backdrop={backdrop}
      subtitle={`${sky.stars.length} de ${SKY_DAYS} estrelas${year}`}
      title="Seu céu de gratidão"
      footer={
        <SkyFooter
          lit={lit}
          done={done}
          onFinish={onFinish}
          onWrite={() => {
            setPeek(false);
            setSelected(null);
          }}
        />
      }
    >
      <Stack.Screen options={{ headerRight: () => null }} />
      <Animated.View entering={FadeIn.delay(600).duration(800)}>
        <AppText variant="subheadline" style={styles.shadow}>
          {progressLine(sky, born)}
        </AppText>
      </Animated.View>
      <View style={[pinned, styles.bottom]}>
        <View style={styles.column}>
          <StarCard sky={sky} selected={selected} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: "rgba(2,4,14,0.62)" },
  instruction: { fontWeight: "400", lineHeight: 26 },
  label: { fontWeight: "600", letterSpacing: 0.5, marginBottom: space.xs },
  shadow: {
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  // Just above the pinned Concluir bar, on the line of the mountains; full width with the card centred in the column.
  bottom: { left: 0, right: 0, bottom: 78, alignItems: "center" },
  column: { width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.xl },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(8,14,32,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
});
