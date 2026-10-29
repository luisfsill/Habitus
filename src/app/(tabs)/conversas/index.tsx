import { router } from "expo-router";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { ConversationRow } from "@/components/conversation-row";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { type Conversation, type Message, previewOf } from "@/domain/chat";
import { addDays, dayKey, formatTime, minutesOfDay } from "@/domain/time";
import { useAccess } from "@/state/access";
import { useConversations } from "@/state/use-chat";
import { useFriends } from "@/state/use-friends";

const open = (id: string) => router.push(`/conversas/${id}`);

/** "14:05" today, "Ontem", else "12/10". */
function whenOf(m: Message, now: Date): string {
  const d = new Date(m.createdAt);
  const day = dayKey(d);
  if (day === dayKey(now)) return formatTime(minutesOfDay(d));
  if (day === dayKey(addDays(now, -1))) return "Ontem";
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Loading({ error, loading, retry }: { error: string | null; loading: boolean; retry: () => void }) {
  return (
    <Screen title="Conversas">
      <AppText variant="body" color={error ? "danger" : "secondaryLabel"} accessibilityLiveRegion="polite">
        {error ?? "Carregando…"}
      </AppText>
      {error && <PrimaryButton label="Tentar de novo" variant="tinted" onPress={retry} loading={loading} />}
    </Screen>
  );
}

function Talk({ c, me, now }: { c: Conversation; me: string; now: Date }) {
  const last = c.last;
  return (
    <ConversationRow
      name={c.peer.name}
      avatarUrl={c.peer.avatarUrl}
      preview={last ? previewOf(last, me) : ""}
      time={last ? whenOf(last, now) : undefined}
      unread={c.unread}
      onPress={() => open(c.peer.id)}
    />
  );
}

export default function ChatsScreen() {
  const me = useAccess().profile?.id ?? "";
  const { conversations, loading, error, reload } = useConversations();
  const { overview } = useFriends();

  if (!conversations) return <Loading error={error} loading={loading} retry={() => void reload()} />;

  const now = new Date();
  const started = conversations.filter((c) => c.last);
  const talking = new Set(started.map((c) => c.peer.id.toLowerCase()));
  const fresh = (overview?.friends ?? []).filter((f) => !talking.has(f.id.toLowerCase()));
  return (
    <Screen title="Conversas">
      {error && (
        <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      {started.length > 0 && (
        <Section>
          {started.map((c) => (
            <Talk key={c.peer.id} c={c} me={me} now={now} />
          ))}
        </Section>
      )}
      {fresh.length > 0 && (
        <Section title="Começar conversa">
          {fresh.map((f) => (
            <ConversationRow key={f.id} name={f.name} avatarUrl={f.avatarUrl} preview={`@${f.username}`} unread={0} onPress={() => open(f.id)} />
          ))}
        </Section>
      )}
      {overview && overview.friends.length === 0 && started.length === 0 && (
        <>
          <AppText variant="body" color="secondaryLabel">
            Adicione amigos para conversar com eles.
          </AppText>
          <ActionRow label="Encontrar amigos" icon={{ ios: "person.badge.plus", android: "person_add" }} navigates onPress={() => router.push("/amigos/lista")} />
        </>
      )}
    </Screen>
  );
}
