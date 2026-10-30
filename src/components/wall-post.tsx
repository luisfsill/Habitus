import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { MAX_POST, type WallPost, postDate, postProblem } from "@/domain/wall";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";
import { TextField } from "./text-field";

interface PostProps {
  post: WallPost;
  now: Date;
  /** Shown above the text: the feed's headline, or the author's name on a mural. */
  title: string;
  onOpenAuthor: () => void;
  /** Left out when the viewer can neither delete it (not the author nor the mural's owner). */
  onDelete?: () => void;
  /** Only for the author: new text for the post (the photo stays). Rejects with the message to show. */
  onEdit?: (body: string) => Promise<void>;
}

/** The post's text in a field, with Cancelar and Salvar. */
function EditBox({ post, onSave, onClose }: { post: WallPost; onSave: (body: string) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(post.body);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = () => {
    const problem = postProblem(text, post.imageUrl !== null);
    if (problem) return setError(problem);
    setBusy(true);
    onSave(text.trim())
      .then(onClose)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <View style={styles.edit}>
      <TextField label="Editar publicação" value={text} onChangeText={setText} multiline maxLength={MAX_POST} autoCapitalize="sentences" style={styles.field} />
      {error && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <View style={styles.actions}>
        <PrimaryButton size="small" variant="tinted" label="Cancelar" onPress={onClose} disabled={busy} />
        <PrimaryButton size="small" label="Salvar" onPress={save} loading={busy} />
      </View>
    </View>
  );
}

/** A post's photo at its own shape (known once loaded), never taller than it is wide by more than 5:4. */
function PostImage({ url }: { url: string }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <Image
      source={{ uri: url }}
      onLoad={(e) => e.source.width > 0 && e.source.height > 0 && setRatio(Math.max(4 / 5, e.source.width / e.source.height))}
      style={[styles.image, { aspectRatio: ratio, backgroundColor: colors.fill }]}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
      accessible
      accessibilityLabel="Foto da publicação"
    />
  );
}

/** One post on a mural or in the feed: author's photo, a headline and when, then the text and the photo. */
export function WallPostCard({ post, now, title, onOpenAuthor, onDelete, onEdit }: PostProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  return (
    <View style={styles.post}>
      <View style={styles.head}>
        <Pressable onPress={onOpenAuthor} accessibilityRole="link" accessibilityLabel={`Abrir perfil de ${post.author.name}`} hitSlop={4}>
          <Avatar url={post.author.avatarUrl} size={36} />
        </Pressable>
        <View style={styles.grow}>
          <AppText variant="subheadline" style={styles.bold}>
            {title}
          </AppText>
          <AppText variant="caption" color="secondaryLabel">
            {post.editedAt ? `${postDate(post.createdAt, now)} · editado` : postDate(post.createdAt, now)}
          </AppText>
        </View>
        {onEdit && !editing && (
          <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Editar publicação" hitSlop={8} style={styles.delete}>
            <Icon ios="pencil" android="edit" size={18} color={colors.secondaryLabel} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Apagar publicação" hitSlop={8} style={styles.delete}>
            <Icon ios="trash" android="delete" size={18} color={colors.secondaryLabel} />
          </Pressable>
        )}
      </View>
      {editing && onEdit ? (
        <EditBox post={post} onSave={onEdit} onClose={() => setEditing(false)} />
      ) : (
        post.body !== "" && <AppText variant="body">{post.body}</AppText>
      )}
      {post.imageUrl && <PostImage url={post.imageUrl} />}
    </View>
  );
}

interface ListProps {
  posts: WallPost[] | null;
  me: string;
  now: Date;
  titleOf: (post: WallPost) => string;
  empty: string;
  onOpen: (id: string) => void;
  onDelete: (post: WallPost) => void;
  /** Left out where posts are read only. */
  onEdit?: (post: WallPost, body: string) => Promise<void>;
}

/** Posts one under another; the viewer may edit what they wrote, and delete it or what is on their own mural. */
export function WallList({ posts, me, now, titleOf, empty, onOpen, onDelete, onEdit }: ListProps) {
  if (!posts) return <AppText variant="body" color="secondaryLabel">Carregando…</AppText>;
  if (!posts.length) return <AppText variant="body" color="secondaryLabel">{empty}</AppText>;
  return (
    <View style={styles.list}>
      {posts.map((p) => (
        <WallPostCard
          key={p.id}
          post={p}
          now={now}
          title={titleOf(p)}
          onOpenAuthor={() => onOpen(p.author.id)}
          onDelete={me === p.author.id || me === p.owner.id ? () => onDelete(p) : undefined}
          onEdit={onEdit && me === p.author.id ? (body) => onEdit(p, body) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  post: { gap: space.sm },
  head: { flexDirection: "row", gap: space.md, alignItems: "center" },
  grow: { flex: 1, gap: 2 },
  bold: { fontWeight: "600" },
  delete: { minWidth: HIT / 1.5, alignItems: "center" },
  // On a wide screen a full-width photo would be taller than the window.
  image: { width: "100%", maxWidth: 560, borderRadius: radius.md },
  list: { gap: space.xl },
  edit: { gap: space.sm },
  // TextField grows to 160 for side-by-side form fields; here it sits alone in a column.
  field: { flexGrow: 0, flexBasis: "auto" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
});
