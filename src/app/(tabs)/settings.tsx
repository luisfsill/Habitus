import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AffirmationsEditor } from "@/components/affirmations-editor";
import { AppText } from "@/components/app-text";
import { BedtimeField } from "@/components/bedtime-field";
import { Icon } from "@/components/icon";
import { PermissionBanners } from "@/components/permission-banner";
import { SchedulePreview } from "@/components/schedule-preview";
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
import { openSystemSettings, pendingCount, scheduleTestRun, sendTestNotification } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { confirm, useSignOut } from "@/state/use-sign-out";
import { TabAccount } from "@/state/tab-account";
import { HIT, useTheme } from "@/theme";

function bedtimeFooter({ minutes, nights, missed }: BedtimeEstimate): string {
  const when = formatTime(minutes);
  const learned =
    nights > 0
      ? `Aprendido: ${when}, pelo horário em que você concluiu a dica nas últimas ${nights} noite${nights > 1 ? "s" : ""}.`
      : `Hoje o lembrete chega às ${when}. O Habitus vai aprender seu horário real conforme você conclui a dica.`;
  const early = missed > 0 ? " Como a dica ficou sem resposta recentemente, o aviso foi antecipado." : "";
  return `${learned}${early} Mudar a hora acima recomeça o aprendizado.`;
}

function AccountSection({ onReset }: { onReset: () => void }) {
  const { session, deleteAccount } = useAuth();
  const leave = useSignOut();
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

  const remove = () =>
    confirm("Excluir conta?", "Sua conta e todo o seu progresso serão apagados. Não dá para desfazer.", "Continuar", () =>
      confirm("Tem certeza?", "Esta é a última confirmação. A conta será excluída agora.", "Excluir conta", () => {
        void deleteAccount().then((result) => setMessage(result.ok ? null : result.message));
      }),
    );

  return (
    <Section title="Conta">
      <View>
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
        {session?.user.email && (
          <View style={styles.row}>
            <AppText variant="body">E-mail</AppText>
            <AppText variant="body" color="secondaryLabel" numberOfLines={1} style={styles.value}>
              {session.user.email}
            </AppText>
          </View>
        )}
      </View>
      <View>
        <ActionRow label="Ver planos" icon={{ ios: "creditcard", android: "credit_card" }} navigates onPress={() => router.push("/renovar")} />
        <ActionRow label="Termos de uso" icon={{ ios: "doc.text", android: "description" }} navigates onPress={() => router.push("/legal/terms")} />
        <ActionRow label="Política de privacidade" icon={{ ios: "lock", android: "lock" }} navigates onPress={() => router.push("/legal/privacy")} />
      </View>
      <View>
        <ActionRow label="Sair" icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout" }} onPress={() => void leave()} />
        <ActionRow label="Resetar dados" icon={{ ios: "arrow.counterclockwise", android: "restart_alt" }} destructive onPress={onReset} />
        <ActionRow label="Excluir conta" icon={{ ios: "trash", android: "delete" }} destructive onPress={remove} />
        {message && (
          <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        )}
      </View>
    </Section>
  );
}

export default function SettingsScreen() {
  const { data, permission, exactAlarms, askExactAlarms, updateSettings, reset, askPermission } = useAppState();
  const [draft, setDraft] = useState(() => ({ ...data.settings }));
  const [status, setStatus] = useState<string | null>(null);
  const { colors } = useTheme();
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
    <Screen title="Ajustes" accessory={<TabAccount />}>
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />

      <Section title="Horário" footer="As 5 primeiras dicas são distribuídas igualmente entre o início e o fim. A 6ª chega na hora de dormir.">
        <TimeField label="Início" value={draft.start} onChange={(start) => void change({ start })} />
        <TimeField label="Fim" value={draft.end} onChange={(end) => void change({ end })} />
        <SchedulePreview start={draft.start} end={draft.end} days={draft.days} bedtime={sleep.minutes} />
      </Section>

      <Section title="Hora de dormir" footer={bedtimeFooter(sleep)}>
        <BedtimeField value={draft.bedtime} onChange={(bedtime) => void change({ bedtime })} />
      </Section>

      <Section title="Dias da semana">
        <WeekdayPicker value={draft.days} onChange={(days) => void change({ days })} />
      </Section>

      <Section title="Afirmações" footer="Aparecem na dica 3, Metas em voz alta. Escreva no presente.">
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
          <ToggleSwitch value={draft.sound} onValueChange={(sound) => void change({ sound })} accessibilityLabel="Som das notificações" />
        </View>
        <View>
          <ActionRow label="Testar uma notificação agora" icon={{ ios: "bell", android: "notifications" }} onPress={() => void testNow()} />
          <ActionRow label="Simular um dia em 5 minutos" icon={{ ios: "timer", android: "timer" }} onPress={() => void testRun()} />
          <ActionRow
            label="Ver notificações agendadas"
            icon={{ ios: "list.bullet", android: "list" }}
            onPress={() => void pendingCount().then((n) => setStatus(`${n} notificações agendadas.`))}
          />
          {status && (
            <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite" style={styles.status}>
              {status}
            </AppText>
          )}
        </View>
      </Section>

      <Section
        title="Água"
        footer={
          draft.water.enabled
            ? "Os lembretes vêm entre o início e o fim do seu dia, fora dos horários das dicas, e param quando você bate a meta."
            : "Opcional. Ligue para receber lembretes de beber água e marcar os copos na tela Hoje."
        }>
        <View style={styles.row}>
          <View style={styles.label}>
            <Icon ios="drop.fill" android="water_drop" color={colors.accent} />
            <AppText variant="body">Lembretes de água</AppText>
          </View>
          <ToggleSwitch
            value={draft.water.enabled}
            onValueChange={(enabled) => void change({ water: { ...draft.water, enabled } })}
            accessibilityLabel="Lembretes de água"
          />
        </View>
        {draft.water.enabled && (
          <View>
            <Stepper
              label="Meta do dia"
              value={`${draft.water.goal} copos`}
              canMinus={draft.water.goal > WATER_GOAL.min}
              canPlus={draft.water.goal < WATER_GOAL.max}
              onMinus={() => void change({ water: { ...draft.water, goal: draft.water.goal - 1 } })}
              onPlus={() => void change({ water: { ...draft.water, goal: draft.water.goal + 1 } })}
            />
            <Stepper
              label="Lembrar a cada"
              value={formatEvery(draft.water.everyMinutes)}
              canMinus={draft.water.everyMinutes > WATER_EVERY.min}
              canPlus={draft.water.everyMinutes < WATER_EVERY.max}
              onMinus={() => void change({ water: { ...draft.water, everyMinutes: draft.water.everyMinutes - WATER_EVERY.step } })}
              onPlus={() => void change({ water: { ...draft.water, everyMinutes: draft.water.everyMinutes + WATER_EVERY.step } })}
            />
          </View>
        )}
      </Section>

      <Section title="Aparência" footer="Automático segue o modo claro ou escuro do aparelho.">
        <ThemeTabs value={data.settings.theme} onChange={(theme) => void change({ theme })} />
      </Section>

      <AccountSection
        onReset={() =>
          confirm("Resetar dados?", "Apaga histórico, afirmações e horários, neste aparelho e na nuvem. Não dá para desfazer.", "Resetar", () => void reset())
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { flexDirection: "row", alignItems: "center", gap: 10 },
  value: { flex: 1, textAlign: "right", marginLeft: 16 },
  status: { marginTop: 4 },
  nameInput: { flex: 1, textAlign: "right", fontSize: 17, minHeight: HIT, marginLeft: 16 },
});
