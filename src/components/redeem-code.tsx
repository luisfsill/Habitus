import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import { INVITE_CODE_LENGTH, normalizeInviteCode } from "@/domain/invites";
import { space } from "@/theme";

import { AuthField } from "./auth-field";
import { GiftOpening } from "./gift-opening";
import { PrimaryButton } from "./primary-button";

interface Props {
  /** Redeems the code; resolves to its license days (null = unlimited), or rejects with the reason. */
  onRedeem: (code: string) => Promise<number | null>;
  /** After the celebration is closed. */
  onDone?: () => void;
}

/** "Resgatar código": the gift code an admin sent, typed in after the account exists; a good one opens the gift. */
export function RedeemCode({ onRedeem, onDone }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // License days of the gift being opened (null = unlimited); undefined while there is none.
  const [gift, setGift] = useState<number | null | undefined>(undefined);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      const days = await onRedeem(code);
      // Out of the field first: closing the celebration would hand focus back to it and scroll the page down to it.
      Keyboard.dismiss();
      setGift(days);
      setCode("");
    } catch (e) {
      setError((e as Error).message);
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
        error={error ?? undefined}
      />
      <PrimaryButton label="Resgatar código" variant="tinted" icon={{ ios: "gift", android: "redeem" }} onPress={() => void redeem()} disabled={code.length !== INVITE_CODE_LENGTH} loading={busy} />
      {gift !== undefined && (
        <GiftOpening
          days={gift}
          onClose={() => {
            setGift(undefined);
            onDone?.();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
});
