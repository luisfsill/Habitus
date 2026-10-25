import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { GlassCard } from "@/components/glass-card";
import { InstallCard } from "@/components/install-card";
import { LevelCard } from "@/components/level-card";
import { PermissionBanners } from "@/components/permission-banner";
import { Screen } from "@/components/screen";
import { TimelineRow } from "@/components/timeline-row";
import { TodaySummary } from "@/components/today-summary";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import { currentStreak, doneCount, trickStatuses } from "@/domain/history";
import { computeSchedule, greetingFor, trickTimeLabels } from "@/domain/schedule";
import { atMinutes, dayKey, formatCountdown, minutesOfDay, type Weekday } from "@/domain/time";
import { TRICKS } from "@/domain/tricks";
import { openSystemSettings } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { useInstallPrompt } from "@/state/use-install-prompt";
import { useNow } from "@/state/use-now";
import { space } from "@/theme";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dateLine(d: Date): string {
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export default function TodayScreen() {
  const { data, permission, exactAlarms, askExactAlarms, progress } = useAppState();
  const install = useInstallPrompt();
  const now = useNow(1000);
  const today = dayKey(now);
  const { start, end, days } = data.settings;
  const result = computeSchedule(start, end, days);
  const activeToday = result.ok && result.schedule.days.includes(now.getDay() as Weekday);
  const done = data.completions[today] ?? [];
  const count = doneCount(data.completions, today);
  const streak = currentStreak(data.completions, now, days);

  const statuses = result.ok ? trickStatuses(done, result.schedule.trickMinutes, minutesOfDay(now)) : [];
  const times = result.ok ? trickTimeLabels(result.schedule) : [];
  const nextIndex = statuses.indexOf("next");
  const nextAt = result.ok && nextIndex >= 0 ? atMinutes(now, result.schedule.trickMinutes[nextIndex]) : null;

  return (
    <Screen title={`${greetingFor(minutesOfDay(now))}!`} subtitle={dateLine(now)}>
      {install.mode !== "hidden" && (
        <InstallCard mode={install.mode} onInstall={() => void install.install()} onDismiss={install.dismiss} />
      )}
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />

      <TodaySummary count={count} streak={streak} activeToday={activeToday} />

      <LevelCard progress={progress} onPress={() => router.navigate("/achievements")} />

      {nextAt && (
        <GlassCard>
          <View accessible accessibilityLabel={`Próximo truque: ${TRICKS[nextIndex].title}, às ${times[nextIndex]}`}>
            <AppText variant="footnote" color="secondaryLabel">
              PRÓXIMO TRUQUE · {times[nextIndex]}
            </AppText>
            <AppText variant="title2" style={styles.nextTitle}>
              {TRICKS[nextIndex].title}
            </AppText>
            <AppText variant="largeTitle" color="accentText" style={styles.digits} accessibilityElementsHidden>
              {formatCountdown(nextAt.getTime() - now.getTime())}
            </AppText>
          </View>
        </GlassCard>
      )}

      <View>
        <AppText variant="title3" accessibilityRole="header" style={styles.sectionTitle}>
          Linha do tempo
        </AppText>
        <GlassCard>
          {TRICKS.map((trick, i) => (
            <TimelineRow
              key={trick.index}
              trick={trick}
              time={times[i] ?? "--:--"}
              status={statuses[i] ?? "pending"}
              last={i === TRICKS.length - 1}
              onPress={() => router.push({ pathname: "/trick/[id]", params: { id: String(trick.index) } })}
            />
          ))}
        </GlassCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  digits: { fontVariant: ["tabular-nums"] },
  nextTitle: { marginTop: 2 },
  sectionTitle: { marginBottom: space.sm, marginLeft: space.xs },
});
