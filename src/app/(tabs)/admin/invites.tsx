import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { InviteMessageModal, InviteRow } from "@/components/invite-parts";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { INVITE_OPTIONS, type Invite, inviteMessage, SITE_URL } from "@/domain/invites";
import { createInvite, deleteInvite, listInvites } from "@/services/admin";
import { confirm } from "@/state/use-sign-out";
import { radius, space, useTheme } from "@/theme";

// The web app links to wherever it is served (preview or production); native builds link to the site.
const origin = Platform.OS === "web" ? window.location.origin : SITE_URL;

export default function AdminInvitesScreen() {
  const { colors } = useTheme();
  const [days, setDays] = useState<number | null>(30);
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

  const show = (invite: Pick<Invite, "code" | "days" | "expiresAt">) => setMessage(inviteMessage(invite, origin));

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await createInvite(days);
      // Same 7 days as admin_create_invite; the list below reloads with the stored date.
      show({ code, days, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
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
    confirm("Excluir convite?", `O código ${invite.code} deixa de valer na hora. Quem já resgatou continua com a licença.`, "Excluir", () => void drop(invite.code));

  const now = new Date();
  return (
    <Screen title="Convites" subtitle="Um código de presente: a pessoa resgata no app e ganha a licença" underHeader>
      <Section title="Licença gratuita">
        <View style={styles.options}>
          {INVITE_OPTIONS.map((o) => (
            <Pressable
              key={o.label}
              onPress={() => setDays(o.days)}
              accessibilityRole="radio"
              accessibilityState={{ selected: days === o.days }}
              style={[styles.chip, { backgroundColor: days === o.days ? colors.label : colors.surface }]}>
              <AppText variant="subheadline" style={{ color: days === o.days ? colors.background : colors.secondaryLabel, fontWeight: "600" }}>
                {o.label}
              </AppText>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label="Gerar convite" onPress={() => void generate()} loading={busy} />
        <AppText variant="footnote" color="secondaryLabel">O código vale por 7 dias e para uma única conta.</AppText>
      </Section>

      {error && <AppText variant="footnote" color="danger">{error}</AppText>}

      {invites.length > 0 && (
        <Section title={`Últimos convites · ${invites.length}`}>
          {invites.map((i) => (
            <InviteRow key={i.code} invite={i} now={now} onOpen={() => show(i)} onDelete={() => remove(i)} />
          ))}
        </Section>
      )}
      <InviteMessageModal message={message} onClose={() => setMessage(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  chip: { paddingHorizontal: space.md, minHeight: 36, justifyContent: "center", borderRadius: radius.pill },
});
