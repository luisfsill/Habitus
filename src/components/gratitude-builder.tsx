import { Pressable, StyleSheet, View } from "react-native";

import { GRATITUDE_AREAS, MAX_PARTS, toggleIdea } from "@/domain/gratitude-ideas";
import { HIT, radius, space } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  parts: readonly string[];
  onChange: (parts: readonly string[]) => void;
  /** Index into GRATITUDE_AREAS of the area whose ideas are listed. */
  area: number;
  onArea: (area: number) => void;
}

const LINE = "rgba(255,255,255,0.18)";
// Light blue that reads on the night sky (the theme accent is too dark there).
const PICKED = "#8FB4FF";

/** Two ideas from two random areas, for someone who does not know where to start. */
function surprise(): readonly string[] {
  const areas = [...GRATITUDE_AREAS].sort(() => Math.random() - 0.5).slice(0, 2);
  return areas.map((a) => a.ideas[Math.floor(Math.random() * a.ideas.length)]);
}

function SmallButton({ label, icon, onPress }: { label: string; icon?: { ios: string; android: string }; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.small, pressed && styles.pressed]}>
      {icon && <Icon ios={icon.ios} android={icon.android} size={14} color="#FFFFFF" />}
      <AppText variant="footnote">{label}</AppText>
    </Pressable>
  );
}

/** The 8 areas in a 4×2 grid, all in view; each shows how many of its ideas are in the phrase. */
function AreaGrid({ parts, area, onArea }: Pick<Props, "parts" | "area" | "onArea">) {
  return (
    <View style={styles.grid} accessibilityRole="tablist">
      {GRATITUDE_AREAS.map((a, i) => {
        const on = i === area;
        const picked = a.ideas.filter((idea) => parts.includes(idea)).length;
        const ink = on ? "#0B1226" : "#FFFFFF";
        return (
          <Pressable
            key={a.name}
            onPress={() => onArea(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={picked ? `${a.name}, ${picked} escolhida${picked > 1 ? "s" : ""}` : a.name}
            style={({ pressed }) => [styles.area, on && styles.areaOn, pressed && styles.pressed]}>
            <Icon ios={a.symbol.ios} android={a.symbol.android} size={20} color={ink} />
            <AppText variant="caption" style={{ color: ink }}>
              {a.name}
            </AppText>
            {picked > 0 && <AppText variant="caption" style={[styles.picked, { color: ink }]}>{`${picked} ✓`}</AppText>}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Gratidão antecipada's phrase builder: pick an area, tap its ideas and the phrase forms itself (rules in
 * domain/gratitude-ideas.ts). Up to five ideas; a second tap takes one out.
 */
export function GratitudeBuilder({ parts, onChange, area, onArea }: Props) {
  const full = parts.length >= MAX_PARTS;
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
          {full ? `${MAX_PARTS} de ${MAX_PARTS}: toque numa para trocar` : `${parts.length} de ${MAX_PARTS} partes`}
        </AppText>
        <View style={styles.actions}>
          <SmallButton label="Me surpreenda" icon={{ ios: "dice.fill", android: "casino" }} onPress={() => onChange(surprise())} />
          {parts.length > 0 && <SmallButton label="Limpar" onPress={() => onChange([])} />}
        </View>
      </View>
      <AreaGrid parts={parts} area={area} onArea={onArea} />
      <View>
        {GRATITUDE_AREAS[area].ideas.map((idea) => {
          const on = parts.includes(idea);
          return (
            <Pressable
              key={idea}
              onPress={() => onChange(toggleIdea(parts, idea))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: full && !on }}
              style={({ pressed }) => [styles.idea, pressed && styles.pressed, full && !on && styles.dim]}>
              <Icon ios={on ? "checkmark" : "plus"} android={on ? "check" : "add"} size={18} color={PICKED} />
              <AppText variant="body" style={on ? styles.ideaOn : undefined}>
                {idea}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm },
  actions: { flexDirection: "row", gap: space.sm },
  small: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.md, minHeight: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: LINE },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  area: { flexBasis: "22%", flexGrow: 1, alignItems: "center", gap: 2, paddingVertical: space.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: LINE },
  areaOn: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  picked: { opacity: 0.75 },
  idea: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  ideaOn: { color: PICKED },
  dim: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});
