import { Pressable, StyleSheet, View } from "react-native";

import type { PagbankEnv, PaymentConfig, PaymentMode } from "@/domain/payments";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { SegmentedTabs } from "./segmented-tabs";

const MODES: readonly { value: PaymentMode; title: string; detail: string }[] = [
  { value: "manual", title: "Manual", detail: "Pix com comprovante pelo WhatsApp" },
  { value: "automatic", title: "Automático", detail: "PagBank libera sozinho" },
];
const ENVS: readonly { value: PagbankEnv; label: string }[] = [
  { value: "sandbox", label: "Teste" },
  { value: "production", label: "Produção" },
];

interface Props {
  config: PaymentConfig;
  onMode: (mode: PaymentMode) => void;
  onEnv: (env: PagbankEnv) => void;
}

/** How members pay: two large radio tiles (Manual / Automático) and, below, which PagBank environment to use. */
export function PaymentMethodPicker({ config, onMode, onEnv }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View accessibilityRole="radiogroup" style={styles.tiles}>
        {MODES.map((m) => {
          const on = config.mode === m.value;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${m.title}, ${m.detail}`}
              onPress={() => !on && onMode(m.value)}
              style={({ pressed }) => [
                styles.tile,
                on
                  ? { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft }
                  : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <View style={styles.flex}>
                <AppText variant="headline" color={on ? "accentText" : "label"}>
                  {m.title}
                </AppText>
                <AppText variant="footnote" color="secondaryLabel">
                  {m.detail}
                </AppText>
              </View>
              {on && <Icon ios="checkmark.circle.fill" android="check_circle" size={22} color={colors.accent} />}
            </Pressable>
          );
        })}
      </View>
      <AppText variant="subheadline" color="secondaryLabel">
        Ambiente do PagBank
      </AppText>
      <SegmentedTabs options={ENVS} value={config.env} onChange={onEnv} />
      {config.mode === "automatic" && (
        <AppText variant="footnote" color="secondaryLabel">
          {config.env === "sandbox"
            ? "Em Teste, ninguém paga de verdade e nada entra no faturamento; só administradores recebem o QR de teste, os demais seguem no Pix manual. "
            : "Em Produção, os Pix são reais. "}
          Os tokens do PagBank ficam nos segredos do Supabase (PAGBANK_TOKEN_SANDBOX e PAGBANK_TOKEN_PRODUCTION). Sem o token do ambiente escolhido, quem assina cai no Pix manual.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  tiles: { gap: space.sm },
  tile: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg },
  flex: { flex: 1, gap: 2 },
});
