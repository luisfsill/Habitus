import "@ncdai/react-wheel-picker/style.css";
import "./wheel-time.css";

import { WheelPicker, type WheelPickerOption, WheelPickerWrapper } from "@ncdai/react-wheel-picker";
import type { CSSProperties } from "react";

import { useTheme } from "@/theme";

import type { WheelTimeProps } from "./wheel-time";

const pad = (n: number) => String(n).padStart(2, "0");
const range = (count: number): WheelPickerOption[] => Array.from({ length: count }, (_, n) => ({ value: pad(n), label: pad(n) }));
const HOURS = range(24);
const MINUTES = range(60);

/** iOS-style hour and minute wheels (drag, flick or scroll; arrow keys when focused). The value is "HH:MM". */
export function WheelTime({ value, onChange }: WheelTimeProps) {
  const { colors } = useTheme();
  const [hours = "00", minutes = "00"] = value.split(":");
  const theme = { "--wt-label": colors.label, "--wt-dim": colors.secondaryLabel, "--wt-fill": colors.fill } as CSSProperties;
  const wheel = { infinite: true, visibleCount: 16, optionItemHeight: 36, classNames: { optionItem: "wt-option", highlightWrapper: "wt-highlight" } };
  return (
    <div className="wt" style={theme}>
      <WheelPickerWrapper className="wt-wrapper">
        <WheelPicker {...wheel} options={HOURS} value={hours} onValueChange={(h) => onChange(`${h}:${minutes}`)} />
        <WheelPicker {...wheel} options={MINUTES} value={minutes} onValueChange={(m) => onChange(`${hours}:${m}`)} />
      </WheelPickerWrapper>
    </div>
  );
}
