import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { formatPrice, type Plan } from "@/domain/access";
import { maskCpf } from "@/domain/cpf";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { CpfField } from "./cpf-field";
import { Icon } from "./icon";
import { PixQr } from "./pix-qr";
import { PrimaryButton } from "./primary-button";

interface Props {
  plan: Plan;
  qrText: string;
  secondsLeft: number;
  outcome: "pending" | "paid" | "expired";
  /** The saved CPF (digits), or null. */
  cpf: string | null;
  onChangeCpf: () => void;
  onRetry: () => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The automatic Pix step: PagBank QR, "copia e cola", countdown and the paid/expired states. */
export function PixStep({ plan, qrText, secondsLeft, outcome, cpf, onChangeCpf, onRetry }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(qrText);
    setCopied(true);
  };
  return (
    <View style={styles.root}>
      <AppText variant="title2" align="center">
        {outcome === "paid" ? "Pagamento confirmado" : outcome === "expired" ? "O Pix expirou" : "Pague com Pix"}
      </AppText>
      <AppText variant="subheadline" color="secondaryLabel" align="center">
        {plan.name} · {formatPrice(plan.priceCents)}
      </AppText>
      {outcome === "pending" && (
        <>
          <PixQr value={qrText} size={232} />
          <PrimaryButton label={copied ? "Código copiado" : "Copiar Pix copia e cola"} variant="tinted" onPress={() => void copy()} />
          <AppText variant="subheadline" color="secondaryLabel" align="center" accessibilityLiveRegion="polite">
            Aguardando pagamento… {clock(secondsLeft)}
          </AppText>
          <View style={[styles.steps, { borderColor: colors.separator }]}>
            <AppText variant="subheadline">Abra o app do seu banco e pague pelo QR Code ou pelo código copiado. O app é liberado na hora em que o pagamento for confirmado.</AppText>
            {cpf && (
              <View style={styles.cpf}>
                <AppText variant="footnote" color="secondaryLabel" style={styles.flex}>
                  CPF {maskCpf(cpf)}
                </AppText>
                <PrimaryButton label="Trocar" variant="plain" onPress={onChangeCpf} />
              </View>
            )}
          </View>
        </>
      )}
      {outcome === "paid" && (
        <View style={styles.paid} accessibilityLiveRegion="polite">
          <Icon ios="checkmark.circle.fill" android="check_circle" size={72} color={colors.success} />
          <AppText variant="body" align="center">
            Recebemos o seu Pix. O Habitus já está liberado. Obrigado!
          </AppText>
        </View>
      )}
      {outcome === "expired" && <PrimaryButton label="Gerar outro Pix" onPress={onRetry} />}
    </View>
  );
}

/** Asks for the payer's CPF before the first automatic Pix. */
export function CpfStep({ cpf, error, onChange }: { cpf: string; error: string | null; onChange: (masked: string) => void }) {
  return (
    <View style={styles.root}>
      <AppText variant="title2" align="center">
        Pix automático
      </AppText>
      <AppText variant="subheadline" color="secondaryLabel" align="center">
        Para gerar a cobrança, o PagBank precisa do CPF de quem paga. Guardamos só para isso.
      </AppText>
      <CpfField value={cpf} onChange={onChange} />
      {error && (
        <AppText variant="footnote" color="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: space.md },
  steps: { alignSelf: "stretch", gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  cpf: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  paid: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
});
