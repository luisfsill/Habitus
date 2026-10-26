import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { AppText } from "@/components/app-text";
import { BedtimeField } from "@/components/bedtime-field";
import { InstallCard } from "@/components/install-card";
import { PrimaryButton } from "@/components/primary-button";
import { SchedulePreview } from "@/components/schedule-preview";
import { Screen } from "@/components/screen";
import { Icon } from "@/components/icon";
import { TimeField } from "@/components/time-field";
import { parseBedtime } from "@/domain/bedtime";
import { computeSchedule } from "@/domain/schedule";
import { TRICKS } from "@/domain/tricks";
import { openSystemSettings, type PermissionState } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { useInstallPrompt } from "@/state/use-install-prompt";
import { radius, space, useTheme } from "@/theme";

const STEPS = 3;

function Dots({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Passo ${step + 1} de ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <Animated.View
          key={i}
          layout={LinearTransition.springify().damping(18)}
          style={[styles.dot, { width: i === step ? 24 : 8, backgroundColor: i === step ? colors.accent : colors.fill }]}
        />
      ))}
    </View>
  );
}

function Intro() {
  const { colors } = useTheme();
  const install = useInstallPrompt();
  return (
    <>
    {install.mode !== "hidden" && (
      <InstallCard mode={install.mode} onInstall={() => void install.install()} onDismiss={install.dismiss} />
    )}
    <View>
      <View style={styles.tricks}>
        {TRICKS.map((t) => (
          <View key={t.index} style={styles.trickRow}>
            <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
              <Icon ios={t.symbol.ios} android={t.symbol.android} size={20} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <AppText variant="headline">{t.title}</AppText>
              <AppText variant="subheadline" color="secondaryLabel">{t.summary}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
    </>
  );
}

interface WindowDraft {
  start: string;
  end: string;
  bedtime: string;
}

function Window({ draft, onChange }: { draft: WindowDraft; onChange: (next: WindowDraft) => void }) {
  const { data } = useAppState();
  const set = (patch: Partial<WindowDraft>) => onChange({ ...draft, ...patch });
  return (
    <View>
      <View style={styles.window}>
        <TimeField label="Início do dia" value={draft.start} onChange={(start) => set({ start })} />
        <TimeField label="Fim do dia" value={draft.end} onChange={(end) => set({ end })} />
        <BedtimeField value={draft.bedtime} onChange={(bedtime) => set({ bedtime })} />
        <AppText variant="footnote" color="secondaryLabel">
          A 6ª dica chega na hora de dormir. Com o tempo, o Habitus aprende seu horário real pelo momento em que você a conclui.
        </AppText>
        <AppText variant="footnote" color="secondaryLabel" style={styles.previewTitle}>
          SEUS HORÁRIOS
        </AppText>
        <SchedulePreview
          start={draft.start}
          end={draft.end}
          days={data.settings.days}
          bedtime={parseBedtime(draft.bedtime) ?? undefined}
        />
      </View>
    </View>
  );
}

function Permission({ state }: { state: PermissionState }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.permission}>
        <Icon
          ios={state === "denied" ? "bell.slash.fill" : "bell.badge.fill"}
          android={state === "denied" ? "notifications_off" : "notifications_active"}
          size={40}
          color={state === "denied" ? colors.warm : colors.accent}
        />
        <AppText variant="body" align="center">
          {state === "denied"
            ? "As notificações estão desativadas. Você pode ativá-las nos Ajustes do aparelho a qualquer momento."
            : "O Habitus avisa você na hora de cada dica, com uma notificação curta. Nada sai do seu aparelho: tudo é agendado localmente."}
        </AppText>
      </View>
    </View>
  );
}

const TITLES = ["6 dicas para o seu dia", "Quando é o seu dia?", "Lembretes na hora certa"];
const SUBTITLES = [
  "Pequenas práticas de bem-estar, espalhadas pelo dia. O Habitus lembra você de cada uma.",
  "Escolha o início e o fim do seu dia e a hora em que costuma dormir.",
  "Para lembrar você, o Habitus precisa de permissão para enviar notificações.",
];

export default function OnboardingScreen() {
  const { data, askPermission, completeOnboarding, permission, updateSettings } = useAppState();
  const [step, setStep] = useState(0);
  const [asked, setAsked] = useState<PermissionState>(permission);
  const [window, setWindow] = useState<WindowDraft>({ start: data.settings.start, end: data.settings.end, bedtime: data.settings.bedtime });
  const valid = computeSchedule(window.start, window.end, data.settings.days).ok;
  const changeWindow = (next: WindowDraft) => {
    setWindow(next);
    void updateSettings(next);
  };

  const primary = async () => {
    if (step < 2) return setStep(step + 1);
    if (asked === "undetermined") {
      const result = await askPermission();
      setAsked(result);
      if (result !== "granted") return;
    }
    await completeOnboarding();
  };

  const label = step < 2 ? "Continuar" : asked === "undetermined" ? "Ativar notificações" : asked === "granted" ? "Começar" : "Continuar sem notificações";

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <PrimaryButton label={label} disabled={step === 1 && !valid} onPress={() => void primary()} />
          {step === 2 && asked === "denied" && (
            <PrimaryButton label="Abrir Ajustes" variant="plain" onPress={() => void openSystemSettings()} />
          )}
          {step > 0 && <PrimaryButton label="Voltar" variant="plain" onPress={() => setStep(step - 1)} />}
        </View>
      }>
      <Dots step={step} />
      <Animated.View key={step} entering={FadeIn.duration(280)} exiting={FadeOut.duration(150)} style={styles.stepBody}>
        <AppText variant="largeTitle" accessibilityRole="header">{TITLES[step]}</AppText>
        <AppText variant="body" color="secondaryLabel">{SUBTITLES[step]}</AppText>
        {step === 0 && <Intro />}
        {step === 1 && <Window draft={window} onChange={changeWindow} />}
        {step === 2 && <Permission state={asked} />}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 6, marginBottom: space.sm },
  dot: { height: 8, borderRadius: 4 },
  stepBody: { gap: space.lg },
  tricks: { gap: space.lg },
  trickRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  window: { gap: space.md },
  previewTitle: { fontWeight: "600", letterSpacing: 0.5, marginTop: space.sm },
  permission: { alignItems: "center", gap: space.lg, paddingVertical: space.md },
  footer: { gap: space.xs },
});
