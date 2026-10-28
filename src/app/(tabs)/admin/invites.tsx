import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { InviteMessageModal, InviteRow } from "@/components/invite-parts";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { TextField } from "@/components/text-field";
import { INVITE_OPTIONS, type Invite, inviteEntries, inviteMessage, positiveInt, SITE_URL } from "@/domain/invites";
import { createInvite, deleteInvite, listInvites } from "@/services/admin";
import { confirm } from "@/state/use-sign-out";
import { radius, space, useTheme } from "@/theme";

// The web app links to wherever it is served (preview or production); native builds link to the site.
const origin = Platform.OS === "web" ? window.location.origin : SITE_URL;

/** The chip that opens the custom days field. */
const CUSTOM = "Personalizado";

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, { backgroundColor: selected ? colors.label : colors.surface }]}>
      <AppText variant="subheadline" style={{ color: selected ? colors.background : colors.secondaryLabel, fontWeight: "600" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function AdminInvitesScreen() {
  const [choice, setChoice] = useState<string>(INVITE_OPTIONS[0].label);
  const [customDays, setCustomDays] = useState("");
  const [uses, setUses] = useState("1");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listInvites()
      .then(setInvites)
      .catch((e: Error) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const show = (invite: Pick<Invite, "code" | "days" | "expiresAt" | "maxUses">) => setMessage(inviteMessage(invite, origin));

  const generate = async () => {
    const days = choice === CUSTOM ? positiveInt(customDays) : (INVITE_OPTIONS.find((o) => o.label === choice)?.days ?? null);
    const maxUses = positiveInt(uses);
    if (choice === CUSTOM && days === null) return setError("Digite quantos dias de licença o convite dá.");
    if (maxUses === null) return setError("Digite quantas pessoas podem usar o código (1 ou mais).");
    setBusy(true);
    setError(null);
    try {
      const code = await createInvite(days, maxUses);
      // Same 7 days as admin_create_invite; the list below reloads with the stored date.
      show({ code, days, maxUses, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const drop = async (code: string) => {
    try {
      await deleteInvite(code);
      setInvites((list) => list.filter((i) => i.code !== code));
      setMessage((m) => (m?.includes(code) ? null : m));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = (invite: Invite) =>
    confirm(
      "Excluir convite?",
      `O código ${invite.code} deixa de valer na hora e sai do histórico. Quem já resgatou continua com a licença.`,
      "Excluir",
      () => void drop(invite.code),
    );

  const now = new Date();
  const entries = invites.flatMap((i) => inviteEntries(i, now));
  return (
    <Screen title="Convites" subtitle="Um código de presente: a pessoa resgata no app e ganha a licença" underHeader>
      <Section title="Licença gratuita">
        <View style={styles.options}>
          {[...INVITE_OPTIONS.map((o) => o.label), CUSTOM].map((label) => (
            <Chip key={label} label={label} selected={choice === label} onPress={() => setChoice(label)} />
          ))}
        </View>
        <View style={styles.fields}>
          {choice === CUSTOM && (
            <TextField label="Dias de licença" value={customDays} onChangeText={setCustomDays} keyboardType="number-pad" placeholder="Ex.: 3" maxLength={4} />
          )}
          <TextField label="Quantas pessoas podem usar" value={uses} onChangeText={setUses} keyboardType="number-pad" placeholder="Ex.: 10" maxLength={5} />
        </View>
        <PrimaryButton label="Gerar convite" onPress={() => void generate()} loading={busy} />
        <AppText variant="footnote" color="secondaryLabel">
          O código vale por 7 dias. Cada conta resgata uma vez; quando todas as vagas forem usadas, ele para de valer.
        </AppText>
      </Section>

      {error && <AppText variant="footnote" color="danger">{error}</AppText>}

      {entries.length > 0 && (
        <Section title={`Histórico · ${entries.length}`}>
          {entries.map((e) => (
            <InviteRow
              key={`${e.invite.code}-${e.redemption ? `${e.redemption.userId}-${e.redemption.usedAt}` : "open"}`}
              entry={e}
              now={now}
              onOpen={() => show(e.invite)}
              onDelete={() => remove(e.invite)}
            />
          ))}
        </Section>
      )}
      <InviteMessageModal message={message} onClose={() => setMessage(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { paddingHorizontal: space.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill },
});
