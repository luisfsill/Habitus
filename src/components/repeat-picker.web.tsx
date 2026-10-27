import "@ncdai/react-wheel-picker/style.css";
import "./wheel-time.css";

import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";

import { REPEAT_LIMITS, type RepeatUnit } from "@/domain/reminders";
import { useTheme } from "@/theme";

import { REPEAT_UNITS, clampRepeat, unitWord } from "./picker-parts";
import type { RepeatPickerProps } from "./repeat-picker";
import { WHEEL, wheelTheme } from "./wheel-time.web";

/** N and unit wheels ("2 | semanas"). The unit names follow N; changing the unit keeps N within its limit. */
export function RepeatPicker({ value, onChange }: RepeatPickerProps) {
  const { colors } = useTheme();
  const { every, unit } = value;
  const counts: WheelPickerOption<number>[] = Array.from({ length: REPEAT_LIMITS[unit] }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const units: WheelPickerOption<RepeatUnit>[] = REPEAT_UNITS.map((u) => ({ value: u, label: unitWord(u, every) }));
  return (
    <div className="wt" style={wheelTheme(colors)}>
      <WheelPickerWrapper className="wt-wrapper">
        <WheelPicker {...WHEEL} infinite={false} options={counts} value={every} onValueChange={(n) => onChange(clampRepeat(n, unit))} />
        <WheelPicker {...WHEEL} infinite={false} options={units} value={unit} onValueChange={(u) => onChange(clampRepeat(every, u))} />
      </WheelPickerWrapper>
    </div>
  );
}
