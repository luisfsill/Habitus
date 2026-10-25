import { Pressable, StyleSheet, View } from "react-native";

import type { Progress } from "@/domain/achievements";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GlassCard } from "./glass-card";
import { Icon } from "./icon";

interface Props {
  progress: Progress;
  onPress?: () => void;
}

/** Level, belt and an XP bar to the next level. */
export function LevelCard({ progress, onPress }: Props) {
  const { colors } = useTheme();
  const { level, belt, stats } = progress;
  const ratio = level.into / level.needed;
  const missing = level.needed - level.into;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Nível ${level.level}, ${belt.name}. ${stats.xp} XP no total. Faltam ${missing} XP para o nível ${level.level + 1}.`}
      accessibilityHint={onPress ? "Abre suas conquistas" : undefined}>
      <GlassCard>
        <View style={styles.row}>
          <View style={[styles.belt, { backgroundColor: belt.color, borderColor: colors.separator }]}>
            <AppText variant="headline" style={{ color: belt.ink }} maxFontSizeMultiplier={1.2}>
              {level.level}
            </AppText>
          </View>
          <View style={styles.text}>
            <AppText variant="headline">
              Nível {level.level} · {belt.name}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
              <View style={[styles.fill, { width: `${Math.max(ratio * 100, 2)}%`, backgroundColor: colors.accent }]} />
            </View>
            <AppText variant="footnote" color="secondaryLabel">
              {level.into}/{level.needed} XP · faltam {missing} para o nível {level.level + 1}
            </AppText>
          </View>
          {onPress && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  belt: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 6 },
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
