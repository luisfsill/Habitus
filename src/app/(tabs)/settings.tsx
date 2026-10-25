import { useState } from "react";
import { Alert, Platform, StyleSheet, Switch, View } from "react-native";

import { AffirmationsEditor } from "@/components/affirmations-editor";
import { AppText } from "@/components/app-text";
import { PermissionBanners } from "@/components/permission-banner";
import { PrimaryButton } from "@/components/primary-button";
import { SchedulePreview } from "@/components/schedule-preview";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { TimeField } from "@/components/time-field";
import { WeekdayPicker } from "@/components/weekday-picker";
import type { Settings } from "@/domain/app-data";
import { formatTime, minutesOfDay } from "@/domain/time";
import { openSystemSettings, pendingCount, scheduleTestRun, sendTestNotification } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { HIT, useTheme } from "@/theme";

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

export default function SettingsScreen() {
  const { data, permission, exactAlarms, askExactAlarms, updateSettings, reset, askPermission } = useAppState();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(() => ({ ...data.settings }));
  const [status, setStatus] = useState<string | null>(null);

  const change = async (patch: Partial<Settings>) => {
    // Validate the whole draft: an invalid start must not be merged with a saved end.
    const next = { ...draft, ...patch };
    setDraft(next);
    const result = await updateSettings(next);
    setStatus(result.ok ? "Notificações reagendadas." : null);
  };

  const testNow = async () => {
    if (permission !== "granted" && (await askPermission()) !== "granted") return;
    await sendTestNotification();
    setStatus("Notificação de teste chega em 3 segundos.");
  };

  const testRun = async () => {
    if (permission !== "granted" && (await askPermission()) !== "granted") return;
    const dates = await scheduleTestRun(5);
    const last = dates[dates.length - 1];
    setStatus(`Dia simulado: 6 notificações até ${formatTime(minutesOfDay(last))}.`);
  };

  return (
    <Screen title="Ajustes">
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />

      <Section title="Horário" footer="Os 5 truques são distribuídos igualmente entre o início e o fim.">
        <TimeField label="Início" value={draft.start} onChange={(start) => void change({ start })} />
        <TimeField label="Fim" value={draft.end} onChange={(end) => void change({ end })} />
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <SchedulePreview start={draft.start} end={draft.end} days={draft.days} />
      </Section>

      <Section title="Dias da semana">
        <WeekdayPicker value={draft.days} onChange={(days) => void change({ days })} />
      </Section>

      <Section title="Afirmações" footer="Aparecem no truque 3, Metas em voz alta. Escreva no presente.">
        <AffirmationsEditor value={data.settings.affirmations} onChange={(affirmations) => void change({ affirmations })} />
      </Section>

      <Section
        title="Notificações"
        footer={
          Platform.OS === "web"
            ? "Na versão instalada pelo navegador, os lembretes só chegam com o Habitus aberto ou minimizado há pouco. Para lembretes com o app fechado, use o app Android."
            : undefined
        }>
        <View style={styles.row}>
          <AppText variant="body">Som</AppText>
          <Switch
            value={draft.sound}
            onValueChange={(sound) => void change({ sound })}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Som das notificações"
          />
        </View>
        <PrimaryButton label="Testar uma notificação agora" variant="tinted" onPress={() => void testNow()} />
        <PrimaryButton label="Simular um dia em 5 minutos" variant="tinted" onPress={() => void testRun()} />
        <PrimaryButton
          label="Ver notificações agendadas"
          variant="plain"
          onPress={() => void pendingCount().then((n) => setStatus(`${n} notificações agendadas.`))}
        />
        {status && (
          <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
            {status}
          </AppText>
        )}
      </Section>

      <Section title="Dados">
        <PrimaryButton
          label="Resetar dados"
          variant="plain"
          destructive
          onPress={() =>
            confirm("Resetar dados?", "Apaga histórico, afirmações e horários. Não dá para desfazer.", "Resetar", () => void reset())
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { height: StyleSheet.hairlineWidth },
});
