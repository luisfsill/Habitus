import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AccountMenu } from "@/components/account-menu";
import { AppText } from "@/components/app-text";
import { InstallCard } from "@/components/install-card";
import { PermissionBanners } from "@/components/permission-banner";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { StatColumns } from "@/components/stat-columns";
import { TimelineRow } from "@/components/timeline-row";
import { TrialBanner } from "@/components/trial-banner";
import { WaterRow } from "@/components/water-row";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import { firstName, type Profile } from "@/domain/access";
import { currentStreak, doneCount, trickStatuses } from "@/domain/history";
import { scheduleFor } from "@/domain/app-data";
import { greetingFor, trickTimeLabels } from "@/domain/schedule";
import { atMinutes, dayKey, formatCountdown, minutesOfDay, type Weekday } from "@/domain/time";
import { TRICK_COUNT, TRICKS } from "@/domain/tricks";
import { cupsOn } from "@/domain/water";
import { openSystemSettings } from "@/services/notifications";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useAuth } from "@/state/auth";
import { useInstallPrompt } from "@/state/use-install-prompt";
import { useNow } from "@/state/use-now";
import { useSignOut } from "@/state/use-sign-out";
import { space } from "@/theme";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function title(now: Date, profile: Profile | null): string {
  return `${greetingFor(minutesOfDay(now))}${profile ? `, ${firstName(profile)}` : ""}!`;
}

function dateLine(d: Date): string {
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function TodayAccount({ profile }: { profile: Profile | null }) {
  const { updateSettings } = useAppState();
  const { session } = useAuth();
  const signOut = useSignOut();
  const email = session?.user.email;
  if (!email) return null;
  return (
    <AccountMenu
      name={profile?.name || email}
      email={email}
      onTheme={(theme) => void updateSettings({ theme })}
      menu={[
        { label: "Renovar plano", icon: { ios: "arrow.clockwise.circle", android: "autorenew" }, onPress: () => router.push("/renovar") },
        { label: "Sair", icon: { ios: "rectangle.portrait.and.arrow.right", android: "logout" }, destructive: true, onPress: () => void signOut() },
      ]}
    />
  );
}

/** Today's water row, only when the person turned water reminders on. */
function TodayWater({ today }: { today: string }) {
  const { data, addWater } = useAppState();
  if (!data.settings.water.enabled) return null;
  return (
    <Section title="Água">
      <WaterRow cups={cupsOn(data.water, today)} goal={data.settings.water.goal} onAdd={() => void addWater(1)} onRemove={() => void addWater(-1)} />
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

  return (
    <Screen title={title(now, profile)} subtitle={dateLine(now)} accessory={<TodayAccount profile={profile} />}>
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

      <TodayWater today={today} />

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
  );
}

const styles = StyleSheet.create({
  summary: { gap: space.sm },
});
