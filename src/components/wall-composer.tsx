import { Image } from "expo-image";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { MAX_POST, type PickedImage, postProblem } from "@/domain/wall";
import { radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

interface Props {
  /** Read by screen readers as the field's name. */
  label: string;
  placeholder: string;
  /** The writer's photo beside the box. */
  avatarUrl: string | null;
  /** Rejects with the message to show. */
  onSubmit: (text: string, image: PickedImage | null) => Promise<void>;
  /** Left out for text only (a depoimento). */
  onPickImage?: () => Promise<PickedImage | null>;
  onCancel?: () => void;
}

/** A glass card to post: the writer's photo, a box that grows, a small thumbnail of the picked photo, then Foto and Publicar. */
export function WallComposer({ label, placeholder, avatarUrl, onSubmit, onPickImage, onCancel }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  // The web's textarea does not grow by itself: follow the content's height, between one line and MAX_INPUT.
  const [height, setHeight] = useState(MIN_INPUT);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const fit = (h: number) => setHeight(Math.min(MAX_INPUT, Math.max(MIN_INPUT, Math.ceil(h))));
  // The thumbnail narrows the box without changing the text, so the web gets no size event: measure the textarea again.
  useEffect(() => {
    const el = input.current as unknown as HTMLTextAreaElement | null;
    if (Platform.OS !== "web" || !el || typeof el.scrollHeight !== "number") return;
    const before = el.style.height;
    el.style.height = "auto";
    fit(el.scrollHeight);
    el.style.height = before;
  }, [image]);
  const left = MAX_POST - [...text].length;

  const pick = () => {
    if (!onPickImage) return;
    onPickImage()
      .then((picked) => picked && setImage(picked))
      .catch(() => setError("Não foi possível abrir suas fotos."));
  };
  const submit = () => {
    const problem = postProblem(text, image !== null);
    if (problem) return setError(problem);
    setBusy(true);
    onSubmit(text.trim(), image)
      .then(() => {
        setText("");
        setHeight(MIN_INPUT);
        setImage(null);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const card = {
    backgroundColor: colors.glass,
    borderColor: focused ? colors.accent : colors.glassEdge,
    boxShadow: `inset 0 1px 0 ${colors.glassRim}${focused ? `, 0 0 0 3px ${colors.accentSoft}` : ""}`,
  };
  return (
    <View style={[styles.card, card]}>
      <View style={styles.row}>
        <Avatar url={avatarUrl} size={32} />
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryLabel}
          accessibilityLabel={label}
          multiline
          maxLength={MAX_POST}
          autoCapitalize="sentences"
          editable={!busy}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onContentSizeChange={(e) => fit(e.nativeEvent.contentSize.height)}
          style={[type.body, styles.input, { color: colors.label, height: Math.max(height, image ? THUMB : 0) }]}
        />
        {/* A small square in the corner: the text keeps the rest of the card. */}
        {image && (
          <View style={styles.thumb}>
            <Image source={{ uri: image.uri }} style={[styles.thumbImage, { backgroundColor: colors.fill }]} contentFit="cover" accessible accessibilityLabel="Foto escolhida" />
            <Pressable
              onPress={() => setImage(null)}
              accessibilityRole="button"
              accessibilityLabel="Tirar a foto"
              hitSlop={10}
              style={[styles.remove, { backgroundColor: colors.background, borderColor: colors.glassEdge }]}>
              <Icon ios="xmark" android="close" size={12} color={colors.label} />
            </Pressable>
          </View>
        )}
      </View>
      {error && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <View style={styles.bar}>
        {onPickImage && (
          <PrimaryButton size="small" variant="tinted" label="Foto" icon={{ ios: "photo", android: "add_photo_alternate" }} onPress={pick} disabled={busy} accessibilityHint={image ? "Troca a foto" : "Escolhe uma foto"} />
        )}
        {onCancel && <PrimaryButton size="small" variant="tinted" label="Cancelar" onPress={onCancel} disabled={busy} />}
        <View style={styles.grow} />
        {left <= 100 && (
          <AppText variant="caption" color={left < 0 ? "danger" : "secondaryLabel"}>
            {left}
          </AppText>
        )}
        <PrimaryButton size="small" label="Publicar" onPress={submit} loading={busy} />
      </View>
    </View>
  );
}

const THUMB = 56;
const MIN_INPUT = 44;
const MAX_INPUT = 240;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  input: { flex: 1, paddingTop: space.sm, textAlignVertical: "top" },
  thumb: { width: THUMB, height: THUMB },
  thumbImage: { width: THUMB, height: THUMB, borderRadius: radius.sm },
  remove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bar: { flexDirection: "row", alignItems: "center", gap: space.sm },
  grow: { flex: 1 },
});
