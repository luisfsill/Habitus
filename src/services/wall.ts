import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { type PickedImage, type WallPost, parseWallPost, parseWallPosts } from "@/domain/wall";

import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

const BUCKET = "wall";
/** Longest side of a saved photo, in pixels: sharp on a phone, well under the bucket's 2 MB. */
const MAX_SIDE = 1440;

async function call(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const result = await requireSupabase().rpc(name, args);
  if (result.error) throw serviceError(result.error);
  return result.data as unknown;
}

/** A photo from the library, uncropped; null when the person cancels. */
export async function pickPostImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** Shrinks to MAX_SIDE on the longest side and saves as JPEG. */
async function smallJpeg({ uri, width, height }: PickedImage): Promise<ArrayBuffer> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height, 1));
  const context = ImageManipulator.manipulate(uri).resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  context.release();
  image.release();
  return (await fetch(saved.uri)).arrayBuffer();
}

/** Uploads under the author's folder with a random name (the link cannot be guessed) and returns the public link. */
async function uploadImage(userId: string, image: PickedImage): Promise<string> {
  const client = requireSupabase();
  const path = `${userId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}.jpg`;
  const upload = await client.storage.from(BUCKET).upload(path, await smallJpeg(image), { contentType: "image/jpeg" });
  if (upload.error) throw new Error("Não foi possível enviar a foto. Tente de novo.");
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** The path inside the bucket from a public link, or null when it is not one of ours. */
function pathOf(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  return url?.includes(marker) ? url.slice(url.indexOf(marker) + marker.length) : null;
}

/** On one's own mural (target = me) or a depoimento on a friend's; `me` names the photo's folder. */
export async function postOnWall(me: string, target: string, body: string, image?: PickedImage | null): Promise<WallPost> {
  const imageUrl = image ? await uploadImage(me, image) : null;
  const post = parseWallPost(await call("post_on_wall", { target, post_body: body, post_image: imageUrl }));
  if (!post) throw new Error("Não deu para publicar. Tente de novo.");
  return post;
}

/** New text for a post the viewer wrote; the photo stays. */
export async function editWallPost(id: string, body: string): Promise<WallPost> {
  const post = parseWallPost(await call("edit_wall_post", { post_id: Number(id), post_body: body }));
  if (!post) throw new Error("Não deu para salvar. Tente de novo.");
  return post;
}

export async function deleteWallPost(post: WallPost): Promise<void> {
  await call("delete_wall_post", { post_id: Number(post.id) });
  const path = pathOf(post.imageUrl);
  // Best effort, and only the author's own folder: shortcut: a friend's photo deleted by the mural's owner stays in storage, add a server-side cleanup if it piles up.
  if (path) await requireSupabase().storage.from(BUCKET).remove([path]);
}

export async function wallOf(id: string): Promise<WallPost[]> {
  return parseWallPosts(await call("wall_of", { uid: id }));
}

export async function wallFeed(): Promise<WallPost[]> {
  return parseWallPosts(await call("wall_feed"));
}
