import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { InstallCard } from "@/components/install-card";
import { PermissionBanners } from "@/components/permission-banner";
import { ReminderHero } from "@/components/reminder-hero";
import { ReminderRow } from "@/components/reminder-row";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { StatColumns } from "@/components/stat-columns";
import { TimelineRow } from "@/components/timeline-row";
import { TrialBanner } from "@/components/trial-banner";
import { WaterRow } from "@/components/water-row";
import { WaterSplash } from "@/components/water-splash";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import { firstName, type Profile } from "@/domain/access";
import { currentStreak, doneCount, trickStatuses } from "@/domain/history";
import { scheduleFor } from "@/domain/app-data";
import { formatReminderCountdown, shortDay, whenLabel } from "@/domain/reminder-text";
import { doneReminders, pendingReminders } from "@/domain/reminders";
import { greetingFor, trickTimeLabels } from "@/domain/schedule";
import { atMinutes, dayKey, formatCountdown, formatTime, minutesOfDay, type Weekday } from "@/domain/time";
import { TRICK_COUNT, TRICKS } from "@/domain/tricks";
import { cupsOn } from "@/domain/water";
import { openSystemSettings } from "@/services/notifications";
import { playDrop } from "@/services/sound";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useInstallPrompt } from "@/state/use-install-prompt";
import { useNow } from "@/state/use-now";
import { TabAccount } from "@/state/tab-account";
import { space } from "@/theme";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function title(now: Date, profile: Profile | null): string {
  return `${greetingFor(minutesOfDay(now))}${profile ? `, ${firstName(profile)}` : ""}!`;
}

function dateLine(d: Date): string {
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** Today's water row, only when the person turned water reminders on. Each cup drops a splash and a "gluk". */
function TodayWater({ today, onDrink }: { today: string; onDrink: () => void }) {
  const { data, addWater } = useAppState();
  if (!data.settings.water.enabled) return null;
  const drink = () => {
    void addWater(1);
    playDrop();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDrink();
  };
  return (
    <Section title="Água">
      <WaterRow cups={cupsOn(data.water, today)} goal={data.settings.water.goal} onAdd={drink} onRemove={() => void addWater(-1)} />
    </Section>
  );
}

const DAY_MS = 86_400_000;
const openReminder = (id: string) => router.push({ pathname: "/lembretes/[id]", params: { id } });

/** The next reminder featured with a countdown, two more below it, and a shortcut to add one. */
function TodayReminders({ now }: { now: Date }) {
  const { data } = useAppState();
  const pending = pendingReminders(data.reminders, now);
  const [first, ...rest] = pending;
  const add = <ActionRow label="Novo lembrete" icon={{ ios: "plus.circle.fill", android: "add_circle" }} onPress={() => openReminder("novo")} />;
  const all = (pending.length > 0 || doneReminders(data.reminders).length > 0) && (
    <Pressable onPress={() => router.push("/lembretes")} accessibilityRole="link" accessibilityLabel="Ver todos os lembretes" hitSlop={12}>
      <AppText variant="subheadline" color="accentText">
        Ver todos
      </AppText>
    </Pressable>
  );
  if (!first) {
    return (
      <Section title="Lembretes" accessory={all} footer="Crie lembretes para estudo, compras, contas e o que mais precisar.">
        {add}
      </Section>
    );
  }
  const left = first.at.getTime() - now.getTime();
  return (
    <Section title="Lembretes" accessory={all}>
      <ReminderHero
        title={first.reminder.title}
        when={whenLabel(first.at, now)}
        countdown={first.overdue ? "Atrasado" : formatReminderCountdown(left)}
        progress={first.overdue ? 1 : 1 - left / DAY_MS}
        overdue={first.overdue}
        onPress={() => openReminder(first.reminder.id)}
      />
      {rest.slice(0, 2).map(({ reminder, at, overdue }) => (
        <ReminderRow
          key={reminder.id}
          time={formatTime(minutesOfDay(at))}
          day={shortDay(at, now)}
          title={reminder.title}
          overdue={overdue}
          onPress={() => openReminder(reminder.id)}
        />
      ))}
      {add}
    </Section>
  );
}

function summary(count: number, activeToday: boolean): string {
  if (count >= TRICK_COUNT) return "Dia completo! Você fez todas as dicas de hoje.";
  if (!activeToday) return "Dia de descanso. Você pode praticar mesmo assim.";
  const left = TRICK_COUNT - count;
  return left === 1 ? "Falta 1 dica hoje." : `Faltam ${left} dicas hoje.`;
}

export default function TodayScreen() {
  const { data, permission, exactAlarms, askExactAlarms, progress } = useAppState();
  const install = useInstallPrompt();
  const now = useNow(1000);
  const today = dayKey(now);
  const { days } = data.settings;
  const result = scheduleFor(data, now);
  const activeToday = result.ok && result.schedule.days.includes(now.getDay() as Weekday);
  const done = data.completions[today] ?? [];
  const count = doneCount(data.completions, today);
  const streak = currentStreak(data.completions, now, days);

  const statuses = result.ok ? trickStatuses(done, result.schedule.trickMinutes, minutesOfDay(now)) : [];
  const times = result.ok ? trickTimeLabels(result.schedule) : [];
  const nextIndex = statuses.indexOf("next");
  const nextAt = result.ok && nextIndex >= 0 ? atMinutes(now, result.schedule.trickMinutes[nextIndex]) : null;
  const countdown = nextAt ? formatCountdown(nextAt.getTime() - now.getTime()) : undefined;
  const { profile } = useAccess();
  const { level, belt } = progress;
  // Bumped on each cup: a new key replays the splash from the start.
  const [splash, setSplash] = useState(0);

  return (
    <>
    <Screen title={title(now, profile)} subtitle={dateLine(now)} accessory={<TabAccount />}>
      <TrialBanner profile={profile} now={now} onSeePlans={() => router.push("/renovar")} />
      {install.mode !== "hidden" && (
        <InstallCard mode={install.mode} onInstall={() => void install.install()} onDismiss={install.dismiss} />
      )}
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />

      <View style={styles.summary}>
        <StatColumns
          stats={[
            { value: `${count}/${TRICK_COUNT}`, label: "hoje", color: count >= TRICK_COUNT ? "successText" : "label", accessibilityLabel: `Hoje: ${count} de ${TRICK_COUNT} dicas` },
            { value: String(streak), label: streak === 1 ? "dia seguido" : "dias seguidos", color: "warm" },
            {
              value: String(level.level),
              label: belt.name,
              onPress: () => router.navigate("/achievements"),
              accessibilityLabel: `Nível ${level.level}, ${belt.name}. Abre suas conquistas.`,
            },
          ]}
        />
        <AppText variant="footnote" color="secondaryLabel">
          {summary(count, activeToday)}
        </AppText>
      </View>

      <TodayWater today={today} onDrink={() => setSplash((n) => n + 1)} />

      <TodayReminders now={now} />

      <Section title="Linha do tempo">
        {TRICKS.map((trick, i) => (
          <TimelineRow
            key={trick.index}
            trick={trick}
            time={times[i] ?? "--:--"}
            status={statuses[i] ?? "pending"}
            countdown={i === nextIndex ? countdown : undefined}
            onPress={() => router.push({ pathname: "/trick/[id]", params: { id: String(trick.index) } })}
          />
        ))}
      </Section>
    </Screen>
    {/* Outside the scroll view, so it covers the whole screen. */}
    {splash > 0 && <WaterSplash key={splash} onDone={() => setSplash(0)} />}
    </>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space.sm },
});
