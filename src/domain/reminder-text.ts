import type { Reminder, Repeat } from "./reminders";
import { addDays, dayKey, formatTime, minutesOfDay } from "./time";

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function formatLead(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(plural(days, "dia", "dias"));
  if (h) parts.push(m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`);
  else if (m) parts.push(`${m} min`);
  return parts.join(" e ");
}

const REPEAT_WORDS = {
  day: ["todo dia", "dias"],
  week: ["toda semana", "semanas"],
  month: ["todo mês", "meses"],
  year: ["todo ano", "anos"],
} as const;

export function formatRepeat({ every, unit }: Repeat): string {
  const [one, many] = REPEAT_WORDS[unit];
  return every === 1 ? one : `a cada ${every} ${many}`;
}

function relativeDay(at: Date, now: Date): "today" | "tomorrow" | null {
  const key = dayKey(at);
  if (key === dayKey(now)) return "today";
  return key === dayKey(addDays(now, 1)) ? "tomorrow" : null;
}

export function whenLabel(at: Date, now: Date): string {
  const time = formatTime(minutesOfDay(at));
  const rel = relativeDay(at, now);
  if (rel === "today") return `Hoje às ${time}`;
  if (rel === "tomorrow") return `Amanhã às ${time}`;
  return `${WEEKDAYS[at.getDay()]}, ${at.getDate()} ${MONTHS[at.getMonth()]} às ${time}`;
}

export function groupLabel(at: Date, now: Date, overdue: boolean): string {
  if (overdue) return "Atrasados";
  const rel = relativeDay(at, now);
  if (rel === "today") return "Hoje";
  if (rel === "tomorrow") return "Amanhã";
  const month = MONTH_NAMES[at.getMonth()];
  return at.getFullYear() === now.getFullYear() ? month : `${month} de ${at.getFullYear()}`;
}

export function formatReminderCountdown(ms: number): string {
  if (ms <= 0) return "Agora";
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86400);
  if (days >= 1) return plural(days, "dia", "dias");
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "a", "a e b", "a, b e c". */
export function joinList(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}` : (items[0] ?? "");
}

export function reminderSummary(r: Reminder): string {
  const parts: string[] = [];
  if (r.repeat) parts.push(`↻ ${formatRepeat(r.repeat)}`);
  // Commas only: a lead like "1 dia e 2 h" already holds an "e".
  if (r.leads.length) parts.push(`antecipa ${r.leads.map(formatLead).join(", ")}`);
  return parts.join(" · ");
}

/** Caption under a row's time: "Hoje", "Amanhã", "Sex, 30". */
export function shortDay(at: Date, now: Date): string {
  const rel = relativeDay(at, now);
  if (rel === "today") return "Hoje";
  if (rel === "tomorrow") return "Amanhã";
  return `${WEEKDAYS[at.getDay()]}, ${at.getDate()}`;
}

/** "ter 3 nov", with the year when it is not this year. */
export function shortDate(at: Date, now: Date): string {
  const year = at.getFullYear() === now.getFullYear() ? "" : ` ${at.getFullYear()}`;
  return `${WEEKDAYS[at.getDay()].toLowerCase()} ${at.getDate()} ${MONTHS[at.getMonth()]}${year}`;
}

/** One alert in a list: "hoje 16:00", "amanhã 09:30", "seg 16:00" within the week, else "3 nov 16:00". */
export function alertLabel(at: Date, now: Date): string {
  const time = formatTime(minutesOfDay(at));
  const rel = relativeDay(at, now);
  if (rel) return `${rel === "today" ? "hoje" : "amanhã"} ${time}`;
  // Before the same weekday next week, a weekday name cannot be mistaken.
  const week = addDays(now, 7);
  const withinWeek = at < new Date(week.getFullYear(), week.getMonth(), week.getDate());
  return withinWeek ? `${WEEKDAYS[at.getDay()].toLowerCase()} ${time}` : `${at.getDate()} ${MONTHS[at.getMonth()]} ${time}`;
}

/** "Feito em 25 out, 10:12". */
export function doneLabel(doneAt: number): string {
  const d = new Date(doneAt);
  return `Feito em ${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatTime(minutesOfDay(d))}`;
}

/** Lead 0 ⇔ `alertAt` equals `occurrence`. */
export function alertTitle(title: string, occurrence: Date, alertAt: Date): string {
  const diff = Math.round((occurrence.getTime() - alertAt.getTime()) / 60_000);
  if (diff <= 0) return `Agora: ${title}`;
  if (dayKey(occurrence) === dayKey(alertAt)) return `Daqui a ${formatLead(diff)}: ${title}`;
  return `${whenLabel(occurrence, alertAt)}: ${title}`;
}

export function alertBody(r: Reminder, occurrence: Date, alertAt: Date, lead: number): string {
  if (lead === 0) return r.notes || `Às ${formatTime(minutesOfDay(occurrence))}`;
  return whenLabel(occurrence, alertAt);
}
