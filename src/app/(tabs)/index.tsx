import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { PermissionBanners } from "@/components/permission-banner";
import { ReminderRow } from "@/components/reminder-row";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { TimelineRow } from "@/components/timeline-row";
import { TrialBanner } from "@/components/trial-banner";
import { WallComposer } from "@/components/wall-composer";
import { WallList } from "@/components/wall-post";
import { WaterRow } from "@/components/water-row";
import { WaterSplash } from "@/components/water-splash";
import { WEEKDAY_NAMES } from "@/components/weekday-picker";
import { firstName, type Profile } from "@/domain/access";
import { trickStatuses } from "@/domain/history";
import { scheduleFor } from "@/domain/app-data";
import { formatReminderCountdown, shortDay } from "@/domain/reminder-text";
import { doneReminders, pendingReminders } from "@/domain/reminders";
import { greetingFor, trickTimeLabels } from "@/domain/schedule";
import { atMinutes, MONTHS, dayKey, formatCountdown, formatTime, minutesOfDay } from "@/domain/time";
import { TRICKS } from "@/domain/tricks";
import { cupsOn } from "@/domain/water";
import { feedLine, type WallPost } from "@/domain/wall";
import { openSystemSettings } from "@/services/notifications";
import { playDrop } from "@/services/sound";
import { pickPostImage } from "@/services/wall";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useIncomingCount } from "@/state/use-friends";
import { useNow } from "@/state/use-now";
import { confirm } from "@/state/use-sign-out";
import { useFeedDot, useWall } from "@/state/use-wall";
import { TabAccount } from "@/state/tab-account";

type TabValue = "dia" | "feed";
// Checks the feed for new posts this often while Hoje is on screen.
const FEED_POLL_MS = 60_000;

/** What landed on the friends' murals and one's own, newest first, under a box to post on one's own mural. */
function Feed({ profile, wall }: { profile: Profile; wall: ReturnType<typeof useWall> }) {
  const now = useNow(60_000);
  const { posts, error, publish, edit, remove } = wall;
  const ask = (post: WallPost) => confirm("Apagar publicação?", "Ela sai do mural e do feed.", "Apagar", () => void remove(post));
  return (
    <>
      <WallComposer
        label="Publicar no seu mural"
        placeholder="No que você está pensando?"
        avatarUrl={profile.avatarUrl}
        onSubmit={(text, image) => publish(profile.id, text, image)}
        onPickImage={pickPostImage}
      />
      {error && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <WallList
        posts={posts}
        me={profile.id}
        now={now}
        titleOf={(post) => feedLine(post, profile.id)}
        empty="Quando você ou seus amigos publicarem no mural, ou receberem um depoimento, aparece aqui."
        onOpen={(id) => (id === profile.id ? router.navigate("/profile") : router.push(`/profile/${id}`))}
        onDelete={ask}
        onEdit={edit}
      />
    </>
  );
}

/** Meu dia: water, reminders and the six tips' timeline (streak, count and belt live on the Perfil card). */
function MyDay({ now, onDrink }: { now: Date; onDrink: () => void }) {
  const { data } = useAppState();
  const today = dayKey(now);
  const result = scheduleFor(data, now);
  const done = data.completions[today] ?? [];
  const statuses = result.ok ? trickStatuses(done, result.schedule.trickMinutes, minutesOfDay(now)) : [];
  const times = result.ok ? trickTimeLabels(result.schedule) : [];
  const nextIndex = statuses.indexOf("next");
  const nextAt = result.ok && nextIndex >= 0 ? atMinutes(now, result.schedule.trickMinutes[nextIndex]) : null;
  const countdown = nextAt ? formatCountdown(nextAt.getTime() - now.getTime()) : undefined;
  // No screen gap between these sections: each keeps only its own 12 pt above and below, up to the hairline.
  return (
    <View>
      <TodayWater today={today} onDrink={onDrink} />

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
    </View>
  );
}

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
    <Section>
      <WaterRow cups={cupsOn(data.water, today)} goal={data.settings.water.goal} onAdd={drink} onRemove={() => void addWater(-1)} />
    </Section>
  );
}

const openReminder = (id: string) => router.push({ pathname: "/lembretes/[id]", params: { id } });

/** The next three reminders as plain rows (the first with its countdown), and + Novo / Ver todos in the header. */
function TodayReminders({ now }: { now: Date }) {
  const { data } = useAppState();
  const pending = pendingReminders(data.reminders, now);
  const accessory = (
    <View style={styles.links}>
      <Pressable onPress={() => openReminder("novo")} accessibilityRole="button" accessibilityLabel="Novo lembrete" hitSlop={12}>
        <AppText variant="subheadline" color="accentText">
          + Novo
        </AppText>
      </Pressable>
      {(pending.length > 0 || doneReminders(data.reminders).length > 0) && (
        <Pressable onPress={() => router.push("/lembretes")} accessibilityRole="link" accessibilityLabel="Ver todos os lembretes" hitSlop={12}>
          <AppText variant="subheadline" color="accentText">
            Ver todos
          </AppText>
        </Pressable>
      )}
    </View>
  );
  return (
    <Section title="Lembretes" accessory={accessory}>
      {pending.length === 0 ? (
        <AppText variant="subheadline" color="secondaryLabel">
          Nenhum lembrete pendente.
        </AppText>
      ) : (
        pending.slice(0, 3).map(({ reminder, at, overdue }, i) => {
          const left = formatReminderCountdown(at.getTime() - now.getTime());
          return (
            <ReminderRow
              key={reminder.id}
              time={formatTime(minutesOfDay(at))}
              day={shortDay(at, now)}
              title={reminder.title}
              detail={i === 0 && !overdue ? (left === "Agora" ? "Agora" : `Faltam ${left}`) : undefined}
              overdue={overdue}
              onPress={() => openReminder(reminder.id)}
            />
          );
        })
      )}
    </Section>
  );
}

export default function TodayScreen() {
  const { permission, exactAlarms, askExactAlarms } = useAppState();
  const now = useNow(1000);
  const { profile } = useAccess();
  // Bumped on each cup: a new key replays the splash from the start.
  const [splash, setSplash] = useState(0);
  const requests = useIncomingCount();
  const [tab, setTab] = useState<TabValue>("dia");
  // Meu dia first: every visit to Hoje opens on it.
  useFocusEffect(useCallback(() => setTab("dia"), []));
  // Loaded here, not in Feed, so the tab can show a dot for new posts while Meu dia is open.
  const wall = useWall("feed", FEED_POLL_MS);
  const feedDot = useFeedDot(profile?.id ?? "", wall.posts, tab === "feed");
  const tabs = [
    { value: "dia", label: "Meu dia" },
    { value: "feed", label: "Feed", dot: feedDot },
  ] as const;

  return (
    <>
    <Screen title={title(now, profile)} subtitle={dateLine(now)} accessory={<TabAccount />}>
      <TrialBanner profile={profile} now={now} onSeePlans={() => router.push("/renovar")} />
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />
      {requests > 0 && (
        <ActionRow label="Pedidos de amizade" icon={{ ios: "bell", android: "notifications" }} detail={requests === 1 ? "1 pessoa quer ser sua amiga" : `${requests} pessoas querem ser suas amigas`} navigates onPress={() => router.push("/profile/lista")} />
      )}

      <SegmentedTabs<TabValue> options={tabs} value={tab} onChange={setTab} />
      {tab === "feed" ? profile && <Feed profile={profile} wall={wall} /> : <MyDay now={now} onDrink={() => setSplash((n) => n + 1)} />}
    </Screen>
    {/* Outside the scroll view, so it covers the whole screen. */}
    {splash > 0 && <WaterSplash key={splash} onDone={() => setSplash(0)} />}
    </>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: "row", gap: 16 },
});
