import { StyleSheet, View } from "react-native";

import { REPEAT_LIMITS, type Repeat } from "@/domain/reminders";
import { space } from "@/theme";

import { REPEAT_UNITS, clampRepeat, unitWord } from "./picker-parts";
import { SegmentedTabs } from "./segmented-tabs";
import { Stepper } from "./stepper";

export interface RepeatPickerProps {
  value: Repeat;
  onChange: (repeat: Repeat) => void;
}

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1);
const UNIT_TABS = REPEAT_UNITS.map((unit) => ({ value: unit, label: capitalize(unitWord(unit, 2)) }));

/** Native: a stepper for N and tabs for the unit (repeat-picker.web.tsx has wheels). */
export function RepeatPicker({ value, onChange }: RepeatPickerProps) {
  const { every, unit } = value;
  return (
    <View style={styles.stack}>
      <Stepper
        label="Intervalo"
        value={`${every} ${unitWord(unit, every)}`}
        canMinus={every > 1}
        canPlus={every < REPEAT_LIMITS[unit]}
        onMinus={() => onChange(clampRepeat(every - 1, unit))}
        onPlus={() => onChange(clampRepeat(every + 1, unit))}
      />
      <SegmentedTabs options={UNIT_TABS} value={unit} onChange={(next) => onChange(clampRepeat(every, next))} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm, paddingBottom: space.xs },
});
