import "@ncdai/react-wheel-picker/style.css";
import "./wheel-time.css";

import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";

import { MONTH_NAMES } from "@/domain/reminder-text";
import { dayKey, fromDayKey } from "@/domain/time";
import { useTheme } from "@/theme";

import type { WheelDateProps } from "./wheel-date";
import { WHEEL, wheelTheme } from "./wheel-time.web";

const YEARS_AHEAD = 5;
const MONTHS: WheelPickerOption<number>[] = MONTH_NAMES.map((label, i) => ({ value: i, label }));
const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const numbers = (from: number, to: number): WheelPickerOption<number>[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: String(from + i) }));

/** Day, month and year wheels (this year + 5). A day past the end of the new month moves to its last day. */
export function WheelDate({ value, onChange }: WheelDateProps) {
  const { colors } = useTheme();
  const date = fromDayKey(value);
  const [year, month, day] = [date.getFullYear(), date.getMonth(), date.getDate()];
  const thisYear = new Date().getFullYear();
  // Keeps an older saved year on the wheel, so editing does not jump it.
  const years = numbers(Math.min(year, thisYear), thisYear + YEARS_AHEAD);
  const pick = (y: number, m: number, d: number) => onChange(dayKey(new Date(y, m, Math.min(d, daysIn(y, m)))));
  return (
    <div className="wt wt-wide wt-date" style={wheelTheme(colors)}>
      <WheelPickerWrapper className="wt-wrapper">
        <WheelPicker {...WHEEL} options={numbers(1, daysIn(year, month))} value={day} onValueChange={(d) => pick(year, month, d)} />
        <WheelPicker {...WHEEL} options={MONTHS} value={month} onValueChange={(m) => pick(year, m, day)} />
        <WheelPicker {...WHEEL} infinite={false} options={years} value={year} onValueChange={(y) => pick(y, month, day)} />
      </WheelPickerWrapper>
    </div>
  );
}
