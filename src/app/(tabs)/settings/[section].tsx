import { Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AffirmationsEditor } from "@/components/affirmations-editor";
import { AppText } from "@/components/app-text";
import { BedtimeField } from "@/components/bedtime-field";
import { Icon } from "@/components/icon";
import { ScheduleTimeline } from "@/components/schedule-timeline";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { Stepper } from "@/components/stepper";
import { ThemeTabs } from "@/components/theme-tabs";
import { TimeField } from "@/components/time-field";
import { ToggleSwitch } from "@/components/toggle-switch";
import { WeekdayPicker } from "@/components/weekday-picker";
import type { Settings } from "@/domain/app-data";
import { type BedtimeEstimate, estimateBedtime } from "@/domain/bedtime";
import { formatTime, minutesOfDay } from "@/domain/time";
import { formatEvery, WATER_EVERY, WATER_GOAL } from "@/domain/water";
import { pendingCount, scheduleTestRun, sendTestNotification } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { HIT, useTheme } from "@/theme";

/** One short line about where the bedtime comes from. */
function bedtimeNote({ nights, missed }: BedtimeEstimate): string {
  const learned = nights > 0 ? `A hora de dormir foi aprendida nas suas últimas ${nights} noite${nights > 1 ? "s" : ""}.` : "O Habitus aprende sua hora de dormir conforme você conclui a última dica.";
  return missed > 0 ? `${learned} O aviso foi antecipado porque a dica ficou sem resposta.` : learned;
}

interface PageProps {
  draft: Settings;
  change: (patch: Partial<Settings>) => Promise<void>;
  setStatus: (status: string) => void;
}

function Schedule({ draft, change }: PageProps) {
  const { data } = useAppState();
  const sleep = estimateBedtime(data.settings.bedtime, data.sleepLog, data.completions, new Date());
  return (
    <>
      <Section plain title="Seu dia" footer={bedtimeNote(sleep)}>
        <TimeField label="Começo do dia" icon={{ ios: "sunrise", android: "wb_sunny" }} value={draft.start} onChange={(start) => void change({ start })} />
        <TimeField label="Fim do dia" icon={{ ios: "sunset", android: "wb_twilight" }} value={draft.end} onChange={(end) => void change({ end })} />
        <BedtimeField icon={{ ios: "moon", android: "bedtime" }} value={draft.bedtime} onChange={(bedtime) => void change({ bedtime })} />
      </Section>
      <Section plain title="Suas 6 dicas" footer="As 5 primeiras se espalham entre o começo e o fim do dia. A última chega na hora de dormir.">
        <ScheduleTimeline start={draft.start} end={draft.end} days={draft.days} bedtime={sleep.minutes} />
      </Section>
    </>
  );
}

function Days({ draft, change }: PageProps) {
  return (
    <Section plain title="Dias da semana">
      <WeekdayPicker value={draft.days} onChange={(days) => void change({ days })} />
    </Section>
  );
}

function Affirmations({ change }: PageProps) {
  const { data } = useAppState();
  return (
    <Section plain title="Afirmações" footer="Aparecem na dica 3, Metas em voz alta. Escreva no presente.">
      <AffirmationsEditor value={data.settings.affirmations} onChange={(affirmations) => void change({ affirmations })} />
    </Section>
  );
}

function Notifications({ draft, change, setStatus }: PageProps) {
  const { permission, askPermission } = useAppState();

  const testNow = async () => {
    if (permission !== "granted" && (await askPermission()) !== "granted") return;
    await sendTestNotification();
    setStatus("Notificação de teste chega em 3 segundos.");
  };

  const testRun = async () => {
    if (permission !== "granted" && (await askPermission()) !== "granted") return;
    const dates = await scheduleTestRun(5);
    const last = dates[dates.length - 1];
    setStatus(`Dia simulado: ${dates.length} notificações até ${formatTime(minutesOfDay(last))}.`);
  };

  return (
    <Section plain title="Notificações">
      <View style={styles.row}>
        <AppText variant="body">Som</AppText>
        <ToggleSwitch value={draft.sound} onValueChange={(sound) => void change({ sound })} accessibilityLabel="Som das notificações" />
      </View>
      <ActionRow label="Testar uma notificação agora" icon={{ ios: "bell", android: "notifications" }} onPress={() => void testNow()} />
      <ActionRow label="Simular um dia em 5 minutos" icon={{ ios: "timer", android: "timer" }} onPress={() => void testRun()} />
      <ActionRow
        label="Ver notificações agendadas"
        icon={{ ios: "list.bullet", android: "list" }}
        onPress={() => void pendingCount().then((n) => setStatus(`${n} notificações agendadas.`))}
      />
    </Section>
  );
}

function Water({ draft, change }: PageProps) {
  const { colors } = useTheme();
  const water = draft.water;
  return (
    <Section
      plain
      title="Água"
      footer={
        water.enabled
          ? "Os lembretes vêm entre o início e o fim do seu dia, fora dos horários das dicas, e param quando você bate a meta."
          : "Opcional. Ligue para receber lembretes de beber água e marcar os copos na tela Hoje."
      }>
      <View style={styles.row}>
        <View style={styles.label}>
          <Icon ios="drop.fill" android="water_drop" color={colors.accent} />
          <AppText variant="body">Lembretes de água</AppText>
        </View>
        <ToggleSwitch value={water.enabled} onValueChange={(enabled) => void change({ water: { ...water, enabled } })} accessibilityLabel="Lembretes de água" />
      </View>
      {water.enabled && (
        <Stepper
          label="Meta do dia"
          value={`${water.goal} copos`}
          canMinus={water.goal > WATER_GOAL.min}
          canPlus={water.goal < WATER_GOAL.max}
          onMinus={() => void change({ water: { ...water, goal: water.goal - 1 } })}
          onPlus={() => void change({ water: { ...water, goal: water.goal + 1 } })}
        />
      )}
      {water.enabled && (
        <Stepper
          label="Lembrar a cada"
          value={formatEvery(water.everyMinutes)}
          canMinus={water.everyMinutes > WATER_EVERY.min}
          canPlus={water.everyMinutes < WATER_EVERY.max}
          onMinus={() => void change({ water: { ...water, everyMinutes: water.everyMinutes - WATER_EVERY.step } })}
          onPlus={() => void change({ water: { ...water, everyMinutes: water.everyMinutes + WATER_EVERY.step } })}
        />
      )}
    </Section>
  );
}

function Appearance({ change }: PageProps) {
  const { data } = useAppState();
  return (
    <Section plain title="Aparência" footer="Auto segue o modo claro ou escuro do aparelho.">
      <ThemeTabs value={data.settings.theme} onChange={(theme) => void change({ theme })} />
    </Section>
  );
}

/** Each menu row of Ajustes opens one of these; the account screen has its own route (conta). */
const PAGES = {
  horario: { title: "Horário", Page: Schedule },
  dias: { title: "Dias da semana", Page: Days },
  afirmacoes: { title: "Afirmações", Page: Affirmations },
  notificacoes: { title: "Notificações", Page: Notifications },
  agua: { title: "Água", Page: Water },
  aparencia: { title: "Aparência", Page: Appearance },
} as const;

export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { data, updateSettings } = useAppState();
  const [draft, setDraft] = useState(() => ({ ...data.settings }));
  const [status, setStatus] = useState<string | null>(null);

  const change = async (patch: Partial<Settings>) => {
    // Validate the whole draft: an invalid start must not be merged with a saved end.
    const next = { ...draft, ...patch };
    setDraft(next);
    const result = await updateSettings(next);
    setStatus(result.ok ? "Notificações reagendadas." : null);
  };

  const page = section in PAGES ? PAGES[section as keyof typeof PAGES] : null;
  if (!page) return <Redirect href="/settings" />;
  const { title, Page } = page;

  return (
    <Screen title={title} underHeader>
      <Page draft={draft} change={change} setStatus={setStatus} />
      {status && (
        <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
          {status}
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { flexDirection: "row", alignItems: "center", gap: 10 },
});
