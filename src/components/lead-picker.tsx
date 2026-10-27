import { View } from "react-native";

import { type LeadParts, joinLead, splitLead } from "./picker-parts";
import { Stepper } from "./stepper";

export interface LeadPickerProps {
  /** Minutes before the reminder, 1..MAX_LEAD_MINUTES. */
  value: number;
  onChange: (minutes: number) => void;
}

/**
 * Native: days, hours and minutes steppers (no generic wheel is installed; the PWA, the main platform,
 * gets wheels in lead-picker.web.tsx). Every value from 1 min to 7 days is reachable.
 */
export function LeadPicker({ value, onChange }: LeadPickerProps) {
  const parts = splitLead(value);
  const { days, hours, mins } = parts;
  const next = (ok: boolean, patch: Partial<LeadParts>) => (ok ? joinLead({ ...parts, ...patch }) : value);
  const rows = [
    {
      label: "Dias",
      shown: `${days} ${days === 1 ? "dia" : "dias"}`,
      down: next(days > 0, { days: days - 1 }),
      up: next(days < 7, { days: days + 1 }),
    },
    { label: "Horas", shown: `${hours} h`, down: next(hours > 0, { hours: hours - 1 }), up: next(hours < 23, { hours: hours + 1 }) },
    {
      label: "Minutos",
      shown: `${mins} min`,
      down: next(mins > 0, { mins: mins - 1 }),
      up: next(mins < 59, { mins: mins + 1 }),
    },
  ];
  return (
    <View>
      {rows.map((row) => (
        <Stepper
          key={row.label}
          label={row.label}
          value={row.shown}
          canMinus={row.down !== value}
          canPlus={row.up !== value}
          onMinus={() => onChange(row.down)}
          onPlus={() => onChange(row.up)}
        />
      ))}
    </View>
  );
}
