import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { MAX_TEXT_LENGTH } from "@/domain/app-data";
import { gratitudePhrase } from "@/domain/gratitude-ideas";
import { radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GratitudeBuilder } from "./gratitude-builder";
import { SegmentedTabs } from "./segmented-tabs";

type Mode = "build" | "write";

interface Props {
  text: string;
  onChangeText: (text: string) => void;
}

const MODES = [
  { value: "build", label: "Montar" },
  { value: "write", label: "Escrever" },
] as const;

/**
 * Today's gratitude phrase, two ways: Montar builds it from ready ideas (GratitudeBuilder), Escrever is free text
 * up to the saved length. Switching keeps the phrase, so a built one can be finished by hand; a tap on an idea
 * rebuilds it from the chosen ideas. A phrase already saved today opens in Escrever.
 */
export function GratitudePhrase({ text, onChangeText }: Props) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>(text ? "write" : "build");
  const [parts, setParts] = useState<readonly string[]>([]);
  const [area, setArea] = useState(0);
  const build = (next: readonly string[]) => {
    setParts(next);
    onChangeText(gratitudePhrase(next));
  };
  return (
    <View style={styles.root}>
      <AppText variant="footnote" color="secondaryLabel" style={styles.label} nativeID="gratitude-label">
        PELO QUE VOCÊ JÁ AGRADECE?
      </AppText>
      <SegmentedTabs options={MODES} value={mode} onChange={setMode} />
      {mode === "write" ? (
        <View>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder="Obrigado porque já…"
            placeholderTextColor={colors.secondaryLabel}
            maxLength={MAX_TEXT_LENGTH}
            multiline
            autoFocus={!text}
            accessibilityLabel="Frase de gratidão"
            accessibilityLabelledBy="gratitude-label"
            style={[type.body, styles.box, styles.input, { color: colors.label }]}
          />
          <AppText variant="caption" color="secondaryLabel" align="right" style={styles.count}>
            {`${text.length}/${MAX_TEXT_LENGTH}`}
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.box} accessibilityLiveRegion="polite">
            <AppText variant="body" color={text ? "label" : "secondaryLabel"}>
              {text || "Obrigado porque já… escolha abaixo"}
            </AppText>
          </View>
          <GratitudeBuilder parts={parts} onChange={build} area={area} onArea={setArea} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  label: { fontWeight: "600", letterSpacing: 0.5, marginBottom: -space.xs },
  box: { minHeight: 76, borderRadius: radius.md, padding: space.md, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.25)" },
  input: { minHeight: 110, textAlignVertical: "top" },
  count: { marginTop: space.xs },
});
