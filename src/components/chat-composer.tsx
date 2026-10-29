import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { textProblem } from "@/domain/chat";
import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { StickerPicker } from "./sticker-picker";

interface Props {
  /** Resolves when sent (the field clears); rejects to keep the text. */
  onSendText: (text: string) => Promise<void>;
  onSendSticker: (id: string) => Promise<void>;
  onNudge: () => Promise<void>;
  /** Milliseconds until the next nudge is allowed (0 = now). */
  nudgeWaitMs: number;
  disabled?: boolean;
  onTyping: (on: boolean) => void;
}

/** Counts down to the time the next nudge is allowed, a tick per second. */
function useWaitLeft(waitMs: number): number {
  const [left, setLeft] = useState(waitMs);
  useEffect(() => {
    const end = Date.now() + waitMs;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const rest = Math.max(0, end - Date.now());
      setLeft(rest);
      if (rest > 0) timer = setTimeout(tick, Math.min(1000, rest));
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [waitMs]);
  return left;
}

function ToolButton({ label, icon, onPress, disabled, active }: { label: string; icon: { ios: string; android: string }; onPress: () => void; disabled?: boolean; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, expanded: active }}
      style={({ pressed }) => [styles.tool, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Icon ios={icon.ios} android={icon.android} size={24} color={colors.accent} />
    </Pressable>
  );
}

/** The message field with the sticker, nudge and send buttons. */
export function ChatComposer({ onSendText, onSendSticker, onNudge, nudgeWaitMs, disabled, onTyping }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stickers, setStickers] = useState(false);
  // RF-5: a ref, not only state, so a second tap in the same frame already sees the first send.
  const inFlight = useRef(false);
  const waitLeft = useWaitLeft(nudgeWaitMs);

  const problem = textProblem(text);
  const locked = disabled || sending;

  const run = (send: () => Promise<void>, after?: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    send()
      .then(after)
      // The screen shows the error; the typed text stays in the field.
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = false;
        setSending(false);
      });
  };

  const change = (next: string) => {
    setText(next);
    onTyping(next !== "");
  };
  const sendText = () => {
    if (problem) return;
    run(
      () => onSendText(text),
      () => {
        setText("");
        onTyping(false);
      },
    );
  };

  const waitSeconds = Math.ceil(waitLeft / 1000);
  return (
    <View style={styles.wrap}>
      {stickers && <StickerPicker onPick={(id) => run(() => onSendSticker(id), () => setStickers(false))} disabled={locked} />}
      <View style={styles.row}>
        <ToolButton label={stickers ? "Fechar figurinhas" : "Figurinhas"} icon={{ ios: "face.smiling", android: "mood" }} onPress={() => setStickers((s) => !s)} disabled={disabled} active={stickers} />
        <ToolButton
          label={waitSeconds > 0 ? `Chamar atenção. Aguarde ${waitSeconds} s` : "Chamar atenção"}
          icon={{ ios: "bell.and.waves.left.and.right", android: "vibration" }}
          onPress={() => run(onNudge)}
          disabled={locked || waitSeconds > 0}
        />
        <TextInput
          value={text}
          onChangeText={change}
          multiline
          editable={!disabled}
          placeholder="Mensagem"
          placeholderTextColor={colors.secondaryLabel}
          accessibilityLabel="Mensagem"
          style={[styles.input, type.body, { color: colors.label, backgroundColor: colors.glass, borderColor: colors.glassEdge }]}
        />
        <ToolButton label="Enviar" icon={{ ios: "arrow.up.circle.fill", android: "send" }} onPress={sendText} disabled={locked || problem !== null} />
      </View>
      {waitSeconds > 0 && (
        <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
          {`Aguarde ${waitSeconds} s para chamar a atenção de novo.`}
        </AppText>
      )}
      {text !== "" && problem && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {problem}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: "row", alignItems: "flex-end", gap: space.xs },
  tool: { minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: HIT, maxHeight: 140, paddingHorizontal: space.md, paddingTop: 11, paddingBottom: 11, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
