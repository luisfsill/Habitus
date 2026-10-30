import { Platform, Pressable, StyleSheet, View } from "react-native";

import type { Message } from "@/domain/chat";
import { stickerLabel } from "@/domain/stickers";
import { formatTime, minutesOfDay } from "@/domain/time";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { StickerImage } from "./sticker-image";

interface Props {
  message: Message;
  mine: boolean;
  /** The friend's first name, for the nudge line. */
  peerName?: string;
  /** Long press, e.g. to report the other person's message. */
  onLongPress?: () => void;
}

// Small, like a big emoji: the animated ones dance big over the chat first (StickerDance).
const STICKER = 56;

const spoken = (m: Message) => (m.kind === "sticker" ? `Figurinha: ${stickerLabel(m.body)}` : m.body);

/** A nudge: a centered line, not a bubble. */
function NudgeLine({ mine, peerName, time }: { mine: boolean; peerName?: string; time: string }) {
  const text = mine ? "Você chamou a atenção" : `${peerName || "Seu amigo"} chamou sua atenção`;
  return (
    <View style={styles.nudge}>
      <AppText variant="footnote" color="accentText" align="center" style={styles.bold}>
        {`${text} · ${time}`}
      </AppText>
    </View>
  );
}

/** One message: a bubble (mine on the right), a sticker without a bubble, or a nudge as a centered line. */
export function ChatBubble({ message, mine, peerName, onLongPress }: Props) {
  const { colors } = useTheme();
  const time = formatTime(minutesOfDay(new Date(message.createdAt)));
  if (message.kind === "nudge") return <NudgeLine mine={mine} peerName={peerName} time={time} />;
  const sticker = message.kind === "sticker";
  const ink = mine && !sticker ? colors.onAccent : colors.label;
  const box = sticker ? null : [styles.bubble, { backgroundColor: mine ? colors.accent : colors.surfaceGlass, borderColor: colors.glassEdge }];
  return (
    <View style={[styles.line, mine ? styles.right : styles.left]}>
      <Pressable
        onLongPress={onLongPress}
        disabled={!onLongPress}
        accessibilityLabel={`${mine ? "Você" : "Mensagem"}, ${time}: ${spoken(message)}`}
        accessibilityHint={onLongPress ? "Toque longo para denunciar" : undefined}
        style={[box, mine ? styles.mine : styles.theirs]}>
        {sticker ? (
          <StickerImage id={message.body} size={STICKER} />
        ) : (
          <AppText variant="body" style={{ color: ink }}>
            {message.body}
          </AppText>
        )}
        <AppText variant="caption" align="right" style={[styles.time, { color: sticker ? colors.secondaryLabel : ink }]}>
          {time}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", paddingVertical: 2 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  // Capped on a wide screen, where 80% of the column would make lines too long to read.
  bubble: { maxWidth: Platform.OS === "web" ? ("min(80%, 560px)" as "80%") : "80%", paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  mine: { borderBottomRightRadius: radius.sm / 2 },
  theirs: { borderBottomLeftRadius: radius.sm / 2 },
  nudge: { paddingVertical: space.sm, alignItems: "center" },
  bold: { fontWeight: "600" },
  time: { opacity: 0.8 },
});
