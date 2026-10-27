import "@ncdai/react-wheel-picker/style.css";
import "./wheel-time.css";

import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import type { CSSProperties } from "react";

import { type Palette, useTheme } from "@/theme";

import type { WheelTimeProps } from "./wheel-time";

const pad = (n: number) => String(n).padStart(2, "0");
const range = (count: number): WheelPickerOption[] => Array.from({ length: count }, (_, n) => ({ value: pad(n), label: pad(n) }));
const HOURS = range(24);
const MINUTES = range(60);

/** Shared look of every web wheel (time, lead time, repeat, date). */
export const WHEEL = { infinite: true, visibleCount: 16, optionItemHeight: 36, classNames: { optionItem: "wt-option", highlightWrapper: "wt-highlight" } };
export const wheelTheme = (colors: Palette) =>
  ({ "--wt-label": colors.label, "--wt-dim": colors.secondaryLabel, "--wt-fill": colors.fill }) as CSSProperties;

/** iOS-style hour and minute wheels (drag, flick or scroll; arrow keys when focused). The value is "HH:MM". */
export function WheelTime({ value, onChange }: WheelTimeProps) {
  const { colors } = useTheme();
  const [hours = "00", minutes = "00"] = value.split(":");
  return (
    <div className="wt" style={wheelTheme(colors)}>
      <WheelPickerWrapper className="wt-wrapper">
        <WheelPicker {...WHEEL} options={HOURS} value={hours} onValueChange={(h) => onChange(`${h}:${minutes}`)} />
        <WheelPicker {...WHEEL} options={MINUTES} value={minutes} onValueChange={(m) => onChange(`${hours}:${m}`)} />
      </WheelPickerWrapper>
    </div>
  );
}
