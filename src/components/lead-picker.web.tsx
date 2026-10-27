import "@ncdai/react-wheel-picker/style.css";
import "./wheel-time.css";

import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";

import { useTheme } from "@/theme";

import type { LeadPickerProps } from "./lead-picker";
import { type LeadParts, joinLead, splitLead } from "./picker-parts";
import { WHEEL, wheelTheme } from "./wheel-time.web";

const range = (count: number, suffix: string): WheelPickerOption<number>[] =>
  Array.from({ length: count }, (_, n) => ({ value: n, label: `${n} ${suffix}` }));
const DAYS = range(8, "d");
const HOURS = range(24, "h");
const MINUTES = range(60, "min");

/** Days, hours and minutes wheels, like WheelTime. The total stays within 1 min..7 days. */
export function LeadPicker({ value, onChange }: LeadPickerProps) {
  const { colors } = useTheme();
  const parts = splitLead(value);
  const pick = (patch: Partial<LeadParts>) => onChange(joinLead({ ...parts, ...patch }));
  return (
    <div className="wt wt-wide" style={wheelTheme(colors)}>
      <WheelPickerWrapper className="wt-wrapper">
        <WheelPicker {...WHEEL} infinite={false} options={DAYS} value={parts.days} onValueChange={(days) => pick({ days })} />
        <WheelPicker {...WHEEL} options={HOURS} value={parts.hours} onValueChange={(hours) => pick({ hours })} />
        <WheelPicker {...WHEEL} options={MINUTES} value={parts.mins} onValueChange={(mins) => pick({ mins })} />
      </WheelPickerWrapper>
    </div>
  );
}
