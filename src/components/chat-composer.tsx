import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, type TextInputKeyPressEvent, type TextInputProps, View } from "react-native";

import Svg, { Path } from "react-native-svg";

import { textProblem } from "@/domain/chat";
import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { StickerPicker } from "./sticker-picker";

// A computer (mouse and physical keyboard): Enter sends, Shift+Enter breaks the line. Phones keep Enter as a new line.
const ENTER_SENDS = Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches === true;

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

// The field grows with the text up to about five lines, then scrolls inside.
const MIN_INPUT = 40;
const MAX_INPUT = 120;

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

/** The text field inside the pill; grows with the text from one line to about five. */
function MessageField({ onFocused, ...input }: Pick<TextInputProps, "value" | "onChangeText" | "onKeyPress" | "editable"> & { onFocused: (on: boolean) => void }) {
  const { colors } = useTheme();
  // Web does not grow a multiline field by itself; native does, within the min and max height.
  const [height, setHeight] = useState(MIN_INPUT);
  return (
    <TextInput
      {...input}
      multiline
      onContentSizeChange={(e) => setHeight(Math.min(MAX_INPUT, Math.max(MIN_INPUT, e.nativeEvent.contentSize.height)))}
      onFocus={() => onFocused(true)}
      onBlur={() => onFocused(false)}
      placeholder="Mensagem..."
      placeholderTextColor={colors.secondaryLabel}
      accessibilityLabel="Mensagem"
      style={[styles.input, type.body, { color: colors.label }, Platform.OS === "web" && [styles.webInput, { height }]]}
    />
  );
}

/** A paper plane tilted up and right, filled white, its fold drawn in the button colour (the direct-message look). */
function PaperPlane({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M21.5 2.5 L14.6 21 L10.9 13.1 L3 9.4 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M21.5 2.5 L10.9 13.1" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Send, once there is text: a pill in the app's accent colour with a paper plane. */
function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Enviar"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.send, { backgroundColor: colors.accent, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
      <PaperPlane color={colors.accent} />
    </Pressable>
  );
}

/** The message field like a direct message: one pill that grows with the text, the sticker and nudge buttons
 * inside it while empty, and the send button in their place once something is typed. */
export function ChatComposer({ onSendText, onSendSticker, onNudge, nudgeWaitMs, disabled, onTyping }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stickers, setStickers] = useState(false);
  // RF-5: a ref, not only state, so a second tap in the same frame already sees the first send.
  const inFlight = useRef(false);
  const waitLeft = useWaitLeft(nudgeWaitMs);
  // The pill's edge lights up while typing (the browser's own focus ring is turned off inside it).
  const [focused, setFocused] = useState(false);

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
  const enterSends = (e: TextInputKeyPressEvent) => {
    const key = e.nativeEvent as { key: string; shiftKey?: boolean; isComposing?: boolean };
    if (!ENTER_SENDS || key.key !== "Enter" || key.shiftKey || key.isComposing) return;
    e.preventDefault();
    sendText();
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
      <View style={[styles.pill, { backgroundColor: colors.glass, borderColor: focused ? colors.accent : colors.glassEdge }]}>
        <MessageField value={text} onChangeText={change} onKeyPress={enterSends} onFocused={setFocused} editable={!disabled} />
        {text === "" ? (
          <>
            <ToolButton label={stickers ? "Fechar figurinhas" : "Figurinhas"} icon={{ ios: "face.smiling", android: "mood" }} onPress={() => setStickers((s) => !s)} disabled={disabled} active={stickers} />
            <ToolButton
              label={waitSeconds > 0 ? `Chamar atenção. Aguarde ${waitSeconds} s` : "Chamar atenção"}
              icon={{ ios: "bell.and.waves.left.and.right", android: "vibration" }}
              onPress={() => run(onNudge)}
              disabled={locked || waitSeconds > 0}
            />
          </>
        ) : (
          <SendButton onPress={sendText} disabled={locked || problem !== null} />
        )}
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
  pill: { flexDirection: "row", alignItems: "flex-end", gap: 2, paddingLeft: space.md, paddingRight: space.xs, paddingVertical: 2, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  tool: { minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: MIN_INPUT, maxHeight: MAX_INPUT, paddingTop: 10, paddingBottom: 10, marginVertical: 2 },
  webInput: { outlineStyle: "none" } as object,
  // 56 × 36, the touch area padded to 44 pt by the pill around it.
  send: { width: 56, height: 36, marginVertical: 4, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
