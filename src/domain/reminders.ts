import { addDays } from "./time";

export type RepeatUnit = "day" | "week" | "month" | "year";
export interface Repeat {
  every: number;
  unit: RepeatUnit;
}
export interface Reminder {
  id: string;
  title: string;
  notes: string;
  /** Primeira ocorrência, hora local "YYYY-MM-DDTHH:MM" (âncora da repetição). */
  at: string;
  /** Minutos antes, únicos, ordem decrescente. */
  leads: number[];
  repeat: Repeat | null;
  /** Só lembrete único: concluído (ms). */
  doneAt: number | null;
  /** Só com repetição: última ocorrência marcada como feita. */
  doneThrough: string | null;
  updatedAt: number;
  /** Lápide (ms). */
  deletedAt: number | null;
}
export interface ReminderDraft {
  title: string;
  notes: string;
  at: string;
  leads: number[];
  repeat: Repeat | null;
}

export const MAX_LEAD_MINUTES = 7 * 24 * 60;
export const MAX_LEADS = 5;
export const MAX_TITLE = 80;
export const MAX_NOTES = 500;
export const REPEAT_LIMITS: Record<RepeatUnit, number> = { day: 365, week: 52, month: 12, year: 1 };
export const TOMBSTONE_DAYS = 30;

const LOOP_LIMIT = 1000;
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function parseLocal(at: string): Date | null {
  const m = LOCAL_PATTERN.exec(at);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  const ok =
    date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === mi;
  return ok ? date : null;
}

export function toLocal(date: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(date.getFullYear(), 4)}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

/** n-ésima ocorrência somada à âncora (nunca encadeada). Mês e ano limitam o dia ao fim do mês. */
export function occurrenceAt(reminder: Pick<Reminder, "at" | "repeat">, n: number): Date {
  const base = parseLocal(reminder.at);
  if (!base) return new Date(NaN);
  const { repeat } = reminder;
  if (!repeat || n === 0) return base;
  const h = base.getHours();
  const mi = base.getMinutes();
  const step = repeat.every * n;
  if (repeat.unit === "day" || repeat.unit === "week") {
    const days = repeat.unit === "day" ? step : step * 7;
    const d = addDays(base, days);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
  }
  const months = repeat.unit === "month" ? step : step * 12;
  const total = base.getMonth() + months;
  const year = base.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(base.getDate(), last), h, mi);
}

/** Índice seguro (uma ocorrência antes) para começar a varrer perto de `floor`. */
function startIndex(reminder: Reminder, floor: Date): number {
  const base = parseLocal(reminder.at);
  if (!base || !reminder.repeat || floor <= base) return 0;
  const { every, unit } = reminder.repeat;
  const months = (floor.getFullYear() - base.getFullYear()) * 12 + floor.getMonth() - base.getMonth();
  const units =
    unit === "month" ? months : unit === "year" ? months / 12 : (floor.getTime() - base.getTime()) / 86400000 / (unit === "week" ? 7 : 1);
  return Math.max(Math.floor(units / every) - 1, 0);
}

function lowerBound(reminder: Reminder, from: Date): Date {
  const done = reminder.doneThrough ? parseLocal(reminder.doneThrough) : null;
  return done && done > from ? done : from;
}

/** Ocorrências pendentes em (from, to]. */
export function occurrencesBetween(reminder: Reminder, from: Date, to: Date): Date[] {
  if (reminder.deletedAt !== null) return [];
  if (!reminder.repeat) {
    const at = parseLocal(reminder.at);
    return at && reminder.doneAt === null && at > from && at <= to ? [at] : [];
  }
  const floor = lowerBound(reminder, from);
  const out: Date[] = [];
  let n = startIndex(reminder, floor);
  for (let i = 0; i < LOOP_LIMIT; i++, n++) {
    const occ = occurrenceAt(reminder, n);
    if (occ > to) break;
    if (occ > floor) out.push(occ);
  }
  return out;
}

export function nextOccurrence(reminder: Reminder, now: Date): Date | null {
  if (reminder.deletedAt !== null) return null;
  if (!reminder.repeat) return reminder.doneAt === null ? parseLocal(reminder.at) : null;
  const floor = lowerBound(reminder, now);
  let n = startIndex(reminder, floor);
  for (let i = 0; i < LOOP_LIMIT; i++, n++) {
    const occ = occurrenceAt(reminder, n);
    if (occ > floor) return occ;
  }
  return null;
}

export function isOverdue(reminder: Reminder, now: Date): boolean {
  if (reminder.repeat || reminder.doneAt !== null || reminder.deletedAt !== null) return false;
  const at = parseLocal(reminder.at);
  return !!at && at < now;
}

export function validateDraft(draft: ReminderDraft, now: Date): string | null {
  if (!draft.title.trim()) return "Dê um nome ao lembrete.";
  const at = parseLocal(draft.at);
  if (!at) return "Escolha a data e a hora.";
  if (!draft.repeat && at < now) return "Escolha uma data e hora no futuro.";
  if (draft.leads.some((l) => !Number.isInteger(l) || l < 1 || l > MAX_LEAD_MINUTES)) return "A antecipação vai de 1 minuto a 7 dias.";
  if (new Set(draft.leads).size > MAX_LEADS) return "Use no máximo 5 antecipações.";
  const r = draft.repeat;
  if (r && (!Number.isInteger(r.every) || r.every < 1 || r.every > REPEAT_LIMITS[r.unit])) return "A repetição vai de 1 dia a 1 ano.";
  return null;
}

export function buildReminder(draft: ReminderDraft, id: string, now: Date, existing?: Reminder): Reminder {
  const changed = !!existing && (existing.at !== draft.at || JSON.stringify(existing.repeat) !== JSON.stringify(draft.repeat));
  const keep = !!existing && !changed;
  return {
    id,
    title: draft.title.trim().slice(0, MAX_TITLE),
    notes: draft.notes.slice(0, MAX_NOTES),
    at: draft.at,
    leads: [...new Set(draft.leads)].sort((a, b) => b - a),
    repeat: draft.repeat,
    doneAt: keep ? existing.doneAt : null,
    doneThrough: keep ? existing.doneThrough : null,
    updatedAt: now.getTime(),
    deletedAt: existing?.deletedAt ?? null,
  };
}

export function completeReminder(reminder: Reminder, occurrence: string, now: Date): Reminder {
  const updatedAt = now.getTime();
  if (!reminder.repeat) return { ...reminder, doneAt: updatedAt, updatedAt };
  const current = reminder.doneThrough;
  return { ...reminder, doneThrough: current && current > occurrence ? current : occurrence, updatedAt };
}

/** Whether `occurrence` (local "YYYY-MM-DDTHH:MM") is already marked done. */
export function isOccurrenceDone(reminder: Reminder, occurrence: string): boolean {
  if (!reminder.repeat) return reminder.doneAt !== null;
  return reminder.doneThrough !== null && reminder.doneThrough >= occurrence;
}

export function reopenReminder(reminder: Reminder, now: Date): Reminder {
  return { ...reminder, doneAt: null, doneThrough: null, updatedAt: now.getTime() };
}

export function deleteReminder(reminder: Reminder, now: Date): Reminder {
  return { ...reminder, deletedAt: now.getTime(), updatedAt: now.getTime() };
}

/** Por data; atrasados vêm antes por serem mais antigos. */
export function pendingReminders(
  all: Readonly<Record<string, Reminder>>,
  now: Date,
): { reminder: Reminder; at: Date; overdue: boolean }[] {
  const out: { reminder: Reminder; at: Date; overdue: boolean }[] = [];
  for (const reminder of Object.values(all)) {
    const at = nextOccurrence(reminder, now);
    if (at) out.push({ reminder, at, overdue: isOverdue(reminder, now) });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The draft as a fresh reminder, to preview its dates in the form. */
function fromDraft(draft: ReminderDraft): Reminder {
  return { ...draft, id: "", doneAt: null, doneThrough: null, updatedAt: 0, deletedAt: null };
}

/** Alerts of the draft's next occurrence after `now`: leads still ahead (unique, earliest first), then the occurrence. */
export function draftAlerts(draft: ReminderDraft, now: Date): Date[] {
  const at = nextOccurrence(fromDraft(draft), now);
  if (!at || !(at > now)) return [];
  const leads = [...new Set(draft.leads)].sort((a, b) => b - a);
  const before = leads.map((lead) => new Date(at.getTime() - lead * 60_000)).filter((d) => d > now);
  return [...before, at];
}

/** The draft's next `count` occurrences after `now`. */
export function draftOccurrences(draft: ReminderDraft, now: Date, count: number): Date[] {
  const reminder = fromDraft(draft);
  const out: Date[] = [];
  let from = now;
  while (out.length < count) {
    const at = nextOccurrence(reminder, from);
    if (!at || !(at > from)) break;
    out.push(at);
    from = at;
  }
  return out;
}

export function doneReminders(all: Readonly<Record<string, Reminder>>): Reminder[] {
  return Object.values(all)
    .filter((r) => r.deletedAt === null && r.doneAt !== null)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stamp(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/** null = no repeat; undefined = invalid (unknown unit). */
function cleanRepeat(raw: unknown): Repeat | null | undefined {
  if (!isRecord(raw)) return null;
  const { unit, every } = raw;
  if (typeof unit !== "string" || !Object.hasOwn(REPEAT_LIMITS, unit)) return undefined;
  const max = REPEAT_LIMITS[unit as RepeatUnit];
  const n = typeof every === "number" && Number.isFinite(every) ? Math.round(every) : 1;
  return { every: Math.min(Math.max(n, 1), max), unit: unit as RepeatUnit };
}

function cleanLeads(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ok = raw.filter((l): l is number => Number.isInteger(l) && l >= 1 && l <= MAX_LEAD_MINUTES);
  return [...new Set(ok)].sort((x, y) => y - x).slice(0, MAX_LEADS);
}

function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function sanitizeOne(key: string, v: unknown, cutoff: number): Reminder | null {
  if (!isRecord(v) || v.id !== key || typeof v.at !== "string") return null;
  const title = cleanText(v.title, MAX_TITLE);
  const updatedAt = stamp(v.updatedAt);
  if (!title || updatedAt === null || !parseLocal(v.at)) return null;
  const repeat = cleanRepeat(v.repeat);
  if (repeat === undefined) return null;
  const leads = cleanLeads(v.leads);
  const deletedAt = stamp(v.deletedAt);
  if (deletedAt !== null && deletedAt < cutoff) return null;
  return {
    id: key,
    title,
    notes: cleanText(v.notes, MAX_NOTES),
    at: v.at,
    leads,
    repeat,
    doneAt: stamp(v.doneAt),
    doneThrough: typeof v.doneThrough === "string" && parseLocal(v.doneThrough) ? v.doneThrough : null,
    updatedAt,
    deletedAt,
  };
}

/** Accepts anything read from storage; drops invalid items and tombstones older than TOMBSTONE_DAYS. */
export function sanitizeReminders(raw: unknown, now: Date = new Date()): Record<string, Reminder> {
  if (!isRecord(raw)) return {};
  const cutoff = now.getTime() - TOMBSTONE_DAYS * 86400000;
  const out: Record<string, Reminder> = {};
  for (const [key, value] of Object.entries(raw)) {
    const r = sanitizeOne(key, value, cutoff);
    if (r) out[key] = r;
  }
  return out;
}

/** Per id, the higher `updatedAt` wins (edit or tombstone); a tie goes to local. */
export function mergeReminders(local: Record<string, Reminder>, remote: Record<string, Reminder>): Record<string, Reminder> {
  const out = { ...remote };
  for (const [id, r] of Object.entries(local)) {
    const other = out[id];
    if (!other || r.updatedAt >= other.updatedAt) out[id] = r;
  }
  return out;
}
