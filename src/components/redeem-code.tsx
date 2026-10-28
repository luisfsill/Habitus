import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { INVITE_CODE_LENGTH, normalizeInviteCode } from "@/domain/invites";
import { space } from "@/theme";

import { AppText } from "./app-text";
import { AuthField } from "./auth-field";
import { PrimaryButton } from "./primary-button";

interface Props {
  /** Redeems the code; resolves to the message to show, or rejects with the reason. */
  onRedeem: (code: string) => Promise<string>;
}

/** "Resgatar código": the gift code an admin sent, typed in after the account exists. */
export function RedeemCode({ onRedeem }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);

  const redeem = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult({ text: await onRedeem(code), error: false });
      setCode("");
    } catch (e) {
      setResult({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <AuthField
        label="Código de presente"
        value={code}
        onChangeText={(text) => setCode(normalizeInviteCode(text))}
        autoCapitalize="characters"
        returnKeyType="done"
        onSubmitEditing={() => code.length === INVITE_CODE_LENGTH && void redeem()}
        error={result?.error ? result.text : undefined}
      />
      <PrimaryButton label="Resgatar código" variant="tinted" onPress={() => void redeem()} disabled={code.length !== INVITE_CODE_LENGTH} loading={busy} />
      {result && !result.error && (
        <AppText variant="footnote" color="successText" accessibilityLiveRegion="polite">
          {result.text}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
});
