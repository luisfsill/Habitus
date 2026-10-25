import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { LevelCard } from "@/components/level-card";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import type { BadgeState } from "@/domain/achievements";
import { BELTS, nextBelt, XP_RULES } from "@/domain/gamification";
import { useAppState } from "@/state/app-state";
import { radius, space, useTheme } from "@/theme";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <GlassCard style={styles.stat}>
      <View accessible accessibilityLabel={`${label}: ${value}`}>
        <AppText variant="title1" color="accentText" style={styles.digits}>
          {value}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel">
          {label}
        </AppText>
      </View>
    </GlassCard>
  );
}

function Badge({ badge }: { badge: BadgeState }) {
  const { colors } = useTheme();
  const { def, unlocked, progress } = badge;
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={`${def.title}: ${def.description} ${unlocked ? "Conquistada." : `Progresso ${progress} de ${def.target}.`}`}>
      <View style={[styles.medal, { backgroundColor: unlocked ? colors.accent : colors.fill }]}>
        <Icon ios={def.symbol.ios} android={def.symbol.android} size={28} color={unlocked ? colors.onAccent : colors.secondaryLabel} />
      </View>
      <AppText variant="footnote" align="center" style={styles.badgeTitle}>
        {def.title}
      </AppText>
      <AppText variant="caption" color="secondaryLabel" align="center">
        {unlocked ? "Conquistada" : `${progress}/${def.target}`}
      </AppText>
    </View>
  );
}

const RULES = [
  `+${XP_RULES.trick} XP por truque concluído`,
  `+${XP_RULES.perfectDay} XP por dia perfeito (todos os truques)`,
  `+${XP_RULES.streakStep} XP extra por dia de sequência, até +${XP_RULES.streakStep * XP_RULES.streakCap}`,
  `+${XP_RULES.perfectWeek} XP por semana perfeita (todos os dias ativos)`,
];

export default function AchievementsScreen() {
  const { progress } = useAppState();
  const { colors } = useTheme();
  const { stats, level, badges } = progress;
  const upcoming = nextBelt(level.level);
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <Screen title="Conquistas" subtitle={`${stats.xp} XP no total`}>
      <LevelCard progress={progress} />

      <View style={styles.stats}>
        <Stat value={stats.currentStreak} label="dias seguidos" />
        <Stat value={stats.bestStreak} label="melhor sequência" />
      </View>
      <View style={styles.stats}>
        <Stat value={stats.perfectDays} label="dias perfeitos" />
        <Stat value={stats.perfectWeeks} label="semanas perfeitas" />
      </View>

      <Section
        title="Patentes"
        footer={upcoming ? `Próxima: ${upcoming.name}, no nível ${upcoming.minLevel}.` : "Você chegou à faixa preta!"}>
        <View style={styles.belts}>
          {BELTS.map((belt) => {
            const reached = level.level >= belt.minLevel;
            const current = progress.belt.name === belt.name;
            return (
              <View
                key={belt.name}
                accessible
                accessibilityLabel={`${belt.name}, nível ${belt.minLevel}. ${current ? "Atual." : reached ? "Conquistada." : "Bloqueada."}`}
                style={[
                  styles.belt,
                  { backgroundColor: belt.color, opacity: reached ? 1 : 0.35, borderColor: colors.separator },
                  current && { borderColor: colors.accent, borderWidth: 3 },
                ]}>
                <AppText variant="caption" style={{ color: belt.ink }} maxFontSizeMultiplier={1.2}>
                  {belt.minLevel}
                </AppText>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title={`Medalhas · ${unlocked}/${badges.length}`}>
        <View style={styles.grid}>
          {badges.map((b) => (
            <Badge key={b.def.id} badge={b} />
          ))}
        </View>
      </Section>

      <Section title="Como ganhar XP">
        {RULES.map((rule) => (
          <AppText key={rule} variant="subheadline">
            {rule}
          </AppText>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space.md },
  stat: { flex: 1 },
  digits: { fontVariant: ["tabular-nums"] },
  belts: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "space-between" },
  belt: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg },
  badge: { width: "33.33%", alignItems: "center", gap: 4, paddingHorizontal: 2 },
  medal: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  badgeTitle: { fontWeight: "600" },
});
