import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { AppText } from "@/components/app-text";
import { BadgeList } from "@/components/badge-list";
import { GlobalRankList } from "@/components/global-rank-list";
import { HistoryPanel } from "@/components/history-panel";
import { LevelCard } from "@/components/level-card";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useGlobalRanking } from "@/state/use-global-ranking";

const TABS = [
  { value: "historico", label: "Histórico" },
  { value: "ranking", label: "Ranking" },
  { value: "medalhas", label: "Medalhas" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function AchievementsScreen() {
  const router = useRouter();
  const { data, progress } = useAppState();
  const { ranking, loading, error, reload, requesting, request } = useGlobalRanking();
  const { isAdmin } = useAccess();
  const { tab: param } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<TabValue>(TABS.find((t) => t.value === param)?.value ?? "historico");
  const { badges } = progress;
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <Screen title="Conquistas">
      <LevelCard progress={progress} />
      <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      {tab === "historico" ? (
        <HistoryPanel data={data} />
      ) : tab === "ranking" ? (
        <Section title="Top 10 da semana">
          {error ? (
            <>
              <AppText variant="subheadline" color="danger">
                {error}
              </AppText>
              <PrimaryButton label="Tentar de novo" variant="tinted" onPress={() => void reload()} />
            </>
          ) : null}
          {ranking ? (
            <GlobalRankList
              ranking={ranking}
              onOpen={(id) => router.push(`/amigos/${id}`)}
              onAdd={(id) => void request(id)}
              requesting={requesting}
              excluded={isAdmin}
            />
          ) : loading ? (
            <AppText variant="subheadline" color="secondaryLabel">
              Carregando…
            </AppText>
          ) : null}
        </Section>
      ) : (
        <Section title={`Medalhas · ${unlocked}/${badges.length}`}>
          <BadgeList badges={badges} />
        </Section>
      )}
    </Screen>
  );
}
