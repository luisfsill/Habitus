import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

const BUCKET = "avatars";
/** Side of the saved square photo, in pixels: sharp at the largest avatar (112 pt at 3x is 336). */
const SIDE = 512;

/** Lets the person pick a photo from the library; null when they cancel. Crops to a square where the OS can. */
export async function pickAvatar(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
  return result.canceled ? null : (result.assets[0] ?? null);
}

/** Center square, 512 px, JPEG: the web picker has no crop step, so this also squares a photo picked there. */
async function squareJpeg({ uri, width, height }: ImagePicker.ImagePickerAsset): Promise<ArrayBuffer> {
  const side = Math.min(width, height);
  const context = ImageManipulator.manipulate(uri)
    .crop({ originX: Math.floor((width - side) / 2), originY: Math.floor((height - side) / 2), width: side, height: side })
    .resize({ width: SIDE, height: SIDE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  context.release();
  image.release();
  return (await fetch(saved.uri)).arrayBuffer();
}

/** The path inside the bucket from a public link, or null when it is not one of ours. */
function pathOf(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  return url?.includes(marker) ? url.slice(url.indexOf(marker) + marker.length) : null;
}

/** Uploads the photo under a new random name, points the profile at it and deletes the old file. */
export async function uploadAvatar(userId: string, asset: ImagePicker.ImagePickerAsset, previous: string | null): Promise<void> {
  const client = requireSupabase();
  const body = await squareJpeg(asset);
  // A new name each time: no stale cached photo, and the link cannot be guessed from the account id.
  const path = `${userId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}.jpg`;
  const upload = await client.storage.from(BUCKET).upload(path, body, { contentType: "image/jpeg" });
  if (upload.error) throw new Error("Não foi possível enviar a foto. Tente de novo.");
  const url = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const saved = await client.rpc("set_my_avatar", { url });
  if (saved.error) throw serviceError(saved.error);
  await removeFile(previous);
}

/** Back to the person icon; the file goes too. */
export async function removeAvatar(previous: string | null): Promise<void> {
  const saved = await requireSupabase().rpc("set_my_avatar", { url: null });
  if (saved.error) throw serviceError(saved.error);
  await removeFile(previous);
}

async function removeFile(url: string | null): Promise<void> {
  const path = pathOf(url);
  // Best effort: a leftover file is only unused storage.
  if (path) await requireSupabase().storage.from(BUCKET).remove([path]);
}
