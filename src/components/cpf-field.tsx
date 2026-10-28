import { View } from "react-native";

import { formatCpf, isValidCpf } from "@/domain/cpf";

import { AppText } from "./app-text";
import { TextField } from "./text-field";

/** "CPF de quem paga" with the 000.000.000-00 mask; says "CPF inválido" once all 11 digits are in and they do not add up. */
export function CpfField({ value, onChange }: { value: string; onChange: (masked: string) => void }) {
  const invalid = value.length === 14 && !isValidCpf(value);
  return (
    <View>
      <TextField label="CPF de quem paga" value={value} onChangeText={(t) => onChange(formatCpf(t))} keyboardType="number-pad" placeholder="000.000.000-00" maxLength={14} autoComplete="off" />
      {invalid && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          CPF inválido
        </AppText>
      )}
    </View>
  );
}
