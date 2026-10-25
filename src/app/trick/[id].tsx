import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/app-text";
import { CircularTimer } from "@/components/circular-timer";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Icon } from "@/components/icon";
import { MAX_TEXT_LENGTH } from "@/domain/app-data";
import { dayKey } from "@/domain/time";
import { isTrickIndex, type Trick, TRICKS } from "@/domain/tricks";
import { useAppState } from "@/state/app-state";
import { radius, space, type, useTheme } from "@/theme";

function Affirmations() {
  const { data } = useAppState();
  return (
    <GlassCard>
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
    </GlassCard>
  );
}

function Gratitude({ text, onChange, onCommit }: { text: string; onChange: (t: string) => void; onCommit: () => void }) {
  const { colors } = useTheme();
  return (
    <GlassCard>
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
    </GlassCard>
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
      <GlassCard>
        <CircularTimer seconds={trick.durationSeconds} />
      </GlassCard>
    );
  }
  if (trick.kind === "affirmations") return <Affirmations />;
  if (trick.kind === "gratitude") {
    return <Gratitude text={gratitude} onChange={onGratitude} onCommit={onCommitGratitude} />;
  }
  return null;
}

/** Back to where the user came from; a trick opened by URL or notification has no history. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function TrickScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, completeTrick, setGratitude } = useAppState();
  const { colors } = useTheme();
  const index = Number(id);
  const [gratitude, setGratitudeText] = useState(data.gratitude[dayKey(new Date())] ?? "");

  if (!isTrickIndex(index)) {
    return (
      <Screen underHeader title="Truque não encontrado">
        <PrimaryButton label="Voltar" onPress={leave} />
      </Screen>
    );
  }

  const trick = TRICKS[index];
  const done = (data.completions[dayKey(new Date())] ?? []).includes(index);

  const finish = async () => {
    if (trick.kind === "gratitude") await setGratitude(gratitude);
    await completeTrick(index);
    leave();
  };

  return (
    <Screen
      underHeader
      subtitle={`Truque ${index + 1} de ${TRICKS.length}`}
      title={trick.title}
      footer={
        <PrimaryButton
          label={done ? "Concluído hoje ✓" : "Concluir"}
          disabled={done}
          accessibilityHint="Marca este truque como feito hoje"
          onPress={() => void finish()}
        />
      }>
      <View style={[styles.hero, { backgroundColor: colors.accentSoft }]}>
        <Icon ios={trick.symbol.ios} android={trick.symbol.android} size={44} color={colors.accent} />
      </View>
      <AppText variant="title3" style={styles.instruction}>
        {trick.instruction}
      </AppText>
      <Practice
        trick={trick}
        gratitude={gratitude}
        onGratitude={setGratitudeText}
        onCommitGratitude={() => void setGratitude(gratitude)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: 88, height: 88, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  instruction: { fontWeight: "400", lineHeight: 28 },
  label: { fontWeight: "600", letterSpacing: 0.5, marginBottom: space.sm },
  affirmation: { marginVertical: space.xs },
  inlineButton: { marginTop: space.sm, alignItems: "flex-start" },
  input: { minHeight: 96, borderRadius: radius.md, padding: space.md, textAlignVertical: "top" },
});
