import { useState } from "react";
import { View } from "react-native";

import { parseBedtime } from "@/domain/bedtime";

import { AppText } from "./app-text";
import { TimeField } from "./time-field";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** "Hora de dormir" row; rejects times that cannot be a bedtime. */
export function BedtimeField({ value, onChange }: Props) {
  const [shown, setShown] = useState(value);
  const valid = parseBedtime(shown) !== null;
  return (
    <View>
      <TimeField
        label="Hora de dormir"
        value={shown}
        onChange={(next) => {
          setShown(next);
          if (parseBedtime(next) !== null) onChange(next);
        }}
      />
      {!valid && (
        <AppText variant="footnote" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          Escolha um horário entre 18:00 e 05:55.
        </AppText>
      )}
    </View>
  );
}
