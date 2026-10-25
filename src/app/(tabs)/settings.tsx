import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Switch, TextInput, View } from "react-native";

import { AffirmationsEditor } from "@/components/affirmations-editor";
import { AppText } from "@/components/app-text";
import { BedtimeField } from "@/components/bedtime-field";
import { PermissionBanners } from "@/components/permission-banner";
import { PrimaryButton } from "@/components/primary-button";
import { SchedulePreview } from "@/components/schedule-preview";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedControl } from "@/components/segmented-control";
import { TimeField } from "@/components/time-field";
import { WeekdayPicker } from "@/components/weekday-picker";
import type { Settings, ThemePreference } from "@/domain/app-data";
import { type BedtimeEstimate, estimateBedtime } from "@/domain/bedtime";
import { formatTime, minutesOfDay } from "@/domain/time";
import { openSystemSettings, pendingCount, scheduleTestRun, sendTestNotification } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
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

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

function bedtimeFooter({ minutes, nights, missed }: BedtimeEstimate): string {
  const when = formatTime(minutes);
  const learned =
    nights > 0
      ? `Aprendido: ${when}, pelo horário em que você concluiu o truque nas últimas ${nights} noite${nights > 1 ? "s" : ""}.`
      : `Hoje o lembrete chega às ${when}. O Habitus vai aprender seu horário real conforme você conclui o truque.`;
  const early = missed > 0 ? " Como o truque ficou sem resposta recentemente, o aviso foi antecipado." : "";
  return `${learned}${early} Mudar a hora acima recomeça o aprendizado.`;
}

function AccountSection() {
  const { session, signOut, deleteAccount } = useAuth();
  const { profile, setName } = useAccess();
  const { colors } = useTheme();
  const [name, setDraftName] = useState(profile?.name ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const saveName = () => {
    if (!name.trim() || name.trim() === profile?.name) return;
    setName(name.trim())
      .then(() => setMessage("Nome salvo."))
      .catch((error: Error) => setMessage(error.message));
  };

  const leave = async () => {
    if ((await signOut()) === "unsynced") {
      confirm(
        "Sair sem enviar?",
        "Algumas mudanças ainda não foram enviadas e serão perdidas. Sair mesmo assim?",
        "Sair",
        () => void signOut({ force: true }),
      );
    }
  };

  const remove = () =>
    confirm("Excluir conta?", "Sua conta e todo o seu progresso serão apagados. Não dá para desfazer.", "Continuar", () =>
      confirm("Tem certeza?", "Esta é a última confirmação. A conta será excluída agora.", "Excluir conta", () => {
        void deleteAccount().then((result) => setMessage(result.ok ? null : result.message));
      }),
    );

  return (
    <Section title="Conta" footer={session?.user.email ? `Conectado como ${session.user.email}.` : undefined}>
      <View style={styles.row}>
        <AppText variant="body">Nome</AppText>
        <TextInput
          value={name}
          onChangeText={(t) => setDraftName(t.slice(0, 80))}
          onBlur={saveName}
          onSubmitEditing={saveName}
          placeholder="Seu nome"
          placeholderTextColor={colors.secondaryLabel}
          autoCapitalize="words"
          accessibilityLabel="Nome"
          style={[styles.nameInput, { color: colors.label }]}
        />
      </View>
      <PrimaryButton label="Ver planos" variant="plain" onPress={() => router.push("/renovar")} />
      <PrimaryButton label="Termos de uso" variant="plain" onPress={() => router.push("/legal/terms")} />
      <PrimaryButton label="Política de privacidade" variant="plain" onPress={() => router.push("/legal/privacy")} />
      <PrimaryButton label="Sair" variant="tinted" onPress={() => void leave()} />
      <PrimaryButton label="Excluir conta" variant="plain" destructive onPress={remove} />
      {message && (
        <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      )}
    </Section>
  );
}

export default function SettingsScreen() {
  const { data, permission, exactAlarms, askExactAlarms, updateSettings, reset, askPermission } = useAppState();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(() => ({ ...data.settings }));
  const [status, setStatus] = useState<string | null>(null);
  const sleep = estimateBedtime(data.settings.bedtime, data.sleepLog, data.completions, new Date());

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
    setStatus(`Dia simulado: ${dates.length} notificações até ${formatTime(minutesOfDay(last))}.`);
  };

  return (
    <Screen title="Ajustes">
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />

      <Section title="Horário" footer="Os 5 primeiros truques são distribuídos igualmente entre o início e o fim. O 6º chega na hora de dormir.">
        <TimeField label="Início" value={draft.start} onChange={(start) => void change({ start })} />
        <TimeField label="Fim" value={draft.end} onChange={(end) => void change({ end })} />
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <SchedulePreview start={draft.start} end={draft.end} days={draft.days} bedtime={sleep.minutes} />
      </Section>

      <Section title="Hora de dormir" footer={bedtimeFooter(sleep)}>
        <BedtimeField value={draft.bedtime} onChange={(bedtime) => void change({ bedtime })} />
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
            trackColor={{ true: colors.accent, false: colors.switchOff }}
            thumbColor="#FFFFFF"
            // react-native-web paints the "on" thumb teal unless told otherwise.
            {...{ activeThumbColor: "#FFFFFF" }}
            ios_backgroundColor={colors.switchOff}
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

      <Section title="Aparência" footer="Automático segue o modo claro ou escuro do aparelho.">
        <SegmentedControl
          label="Aparência"
          options={THEME_OPTIONS}
          value={draft.theme}
          onChange={(theme) => void change({ theme })}
        />
      </Section>

      <AccountSection />

      <Section title="Dados">
        <PrimaryButton
          label="Resetar dados"
          variant="plain"
          destructive
          onPress={() =>
            confirm("Resetar dados?", "Apaga histórico, afirmações e horários, neste aparelho e na nuvem. Não dá para desfazer.", "Resetar", () => void reset())
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { height: StyleSheet.hairlineWidth },
  nameInput: { flex: 1, textAlign: "right", fontSize: 17, minHeight: HIT, marginLeft: 16 },
});
