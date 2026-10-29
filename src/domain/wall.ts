import { type PublicUser, parsePublicUser, isRow, str } from "./friends";
import { MONTHS, addDays, dayKey, formatTime, minutesOfDay } from "./time";

/** Something on `owner`'s mural: a post of their own (author is the owner) or a depoimento from a friend. Text, photo or both. */
export interface WallPost { id: string; body: string; imageUrl: string | null; createdAt: string; editedAt: string | null; owner: PublicUser; author: PublicUser }
/** A photo picked for a post, before it is uploaded. */
export interface PickedImage { uri: string; width: number; height: number }

export const MAX_POST = 1000;

export function parseWallPost(row: unknown): WallPost | null {
  if (!isRow(row)) return null;
  const { id, body, image_url, created_at, edited_at } = row;
  const owner = parsePublicUser(row.owner);
  const author = parsePublicUser(row.author);
  if ((typeof id !== "number" && !str(id)) || typeof body !== "string" || !str(created_at) || !owner || !author) return null;
  const imageUrl = typeof image_url === "string" && image_url.startsWith("https://") ? image_url : null;
  return { id: String(id), body, imageUrl, createdAt: created_at, editedAt: str(edited_at) ? edited_at : null, owner, author };
}

export function parseWallPosts(value: unknown): WallPost[] {
  return Array.isArray(value) ? value.map(parseWallPost).filter((p): p is WallPost => p !== null) : [];
}

export const isTestimonial = (p: WallPost) => p.author.id !== p.owner.id;

/** Whether someone else posted after `seen` (an ISO time; null = Feed never opened, so nothing is new yet). */
export function hasUnseenPosts(posts: readonly WallPost[], seen: string | null, me: string): boolean {
  if (seen === null) return false;
  const since = Date.parse(seen);
  return posts.some((p) => p.author.id !== me && Date.parse(p.createdAt) > since);
}

/** The feed headline: who received a depoimento from whom, or who posted on their own mural. */
export function feedLine(p: WallPost, me: string): string {
  const who = (u: PublicUser, you: string) => (u.id === me ? you : u.name);
  if (!isTestimonial(p)) return `${who(p.owner, "Você")} publicou no mural`;
  return `${who(p.owner, "Você")} recebeu um depoimento de ${who(p.author, "você")}`;
}

/** On a mural: the author's name on a post of their own, "Depoimento de …" on one from a friend. */
export function muralTitle(p: WallPost, me: string): string {
  if (!isTestimonial(p)) return p.author.id === me ? "Você" : p.author.name;
  return `Depoimento de ${p.author.id === me ? "você" : p.author.name}`;
}

/** "Hoje, 14:05", "Ontem, 09:10", "12 de outubro" or "12 de outubro de 2025". */
export function postDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const time = formatTime(minutesOfDay(d));
  if (dayKey(d) === dayKey(now)) return `Hoje, ${time}`;
  if (dayKey(d) === dayKey(addDays(now, -1))) return `Ontem, ${time}`;
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

export function postProblem(text: string, hasImage = false): string | null {
  if (text.trim() === "" && !hasImage) return "Escreva alguma coisa ou escolha uma foto.";
  if ([...text.trim()].length > MAX_POST) return `Texto muito longo (máx. ${MAX_POST}).`;
  return null;
}
