import {
  isOneOffId,
  MAX_PENDING_NOTIFICATIONS,
  planAll,
  planNotifications,
  planTestRun,
  planReminderNotifications,
  pushRow,
  reminderSnooze,
  snoozeNotification,
} from "../notification-plan";
import type { Reminder } from "../reminders";
import { computeSchedule, type DaySchedule } from "../schedule";
import { ALL_WEEKDAYS, formatTime, minutesOfDay, type Weekday } from "../time";

function schedule(start = "08:00", end = "16:00", days: readonly Weekday[] = ALL_WEEKDAYS): DaySchedule {
  const result = computeSchedule(start, end, days);
  if (!result.ok) throw new Error(result.message);
  return result.schedule;
}

// Saturday 24 Oct 2026, 07:00 local.
const saturdayMorning = new Date(2026, 9, 24, 7, 0);

describe("planNotifications", () => {
  it("plans 7 notifications per active day for the next 7 days", () => {
    const plan = planNotifications(schedule(), saturdayMorning);
    expect(plan).toHaveLength(49);
    expect(plan.length).toBeLessThanOrEqual(64);
  });

  it("with water on, plans 3 days and stays under the iOS cap", () => {
    const water = { settings: { enabled: true, goal: 8, everyMinutes: 90 }, start: "08:00", end: "16:00", log: {} };
    const plan = planNotifications(schedule(), saturdayMorning, { water });
    const waterItems = plan.filter((n) => n.kind === "water");
    expect(new Set(plan.map((n) => n.dayKey)).size).toBe(3);
    // Tips are at 08:48, 10:24, 12:00, 13:36 and 15:12: none is within 10 min of these.
    expect(waterItems.filter((n) => n.dayKey === "2026-10-24").map((n) => formatTime(minutesOfDay(n.date)))).toEqual(["09:30", "11:00", "12:30", "14:00", "15:30"]);
    expect(plan.length).toBeLessThanOrEqual(64);
  });

  it("skips water on a day whose goal is met, and when water is off", () => {
    const settings = { enabled: true, goal: 2, everyMinutes: 90 };
    const met = planNotifications(schedule(), saturdayMorning, { water: { settings, start: "08:00", end: "16:00", log: { "2026-10-24": { cups: 2, at: 1 } } } });
    expect(met.some((n) => n.kind === "water" && n.dayKey === "2026-10-24")).toBe(false);
    expect(met.some((n) => n.kind === "water" && n.dayKey === "2026-10-25")).toBe(true);
    const off = planNotifications(schedule(), saturdayMorning, { water: { settings: { ...settings, enabled: false }, start: "08:00", end: "16:00", log: {} } });
    expect(off.some((n) => n.kind === "water")).toBe(false);
    expect(off).toHaveLength(49);
  });

  it("plans nothing after the access cutoff", () => {
    const until = new Date(2026, 9, 25, 10, 0);
    const plan = planNotifications(schedule(), saturdayMorning, { until });
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((n) => n.date.getTime() <= until.getTime())).toBe(true);
  });

  it("writes the opening message with the first trick time", () => {
    const [opening] = planNotifications(schedule(), saturdayMorning);
    expect(opening.kind).toBe("opening");
    expect(formatTime(minutesOfDay(opening.date))).toBe("08:00");
    expect(opening.body).toBe("Bom dia! Hoje você tem 6 dicas para fazer. A primeira chega às 08:48.");
  });

  it("uses the short trick text in the title and body", () => {
    const plan = planNotifications(schedule(), saturdayMorning);
    const powerPose = plan.find((n) => n.trickIndex === 1);
    expect(powerPose?.title).toBe("Hora da dica 2: Postura de poder");
    expect(powerPose?.body).toBe("Levante-se e abra o peito por 2 minutos.");
  });

  it("skips anything at or before now", () => {
    const noon = new Date(2026, 9, 24, 12, 0);
    const today = planNotifications(schedule(), noon).filter((n) => n.dayKey === "2026-10-24");
    expect(today.map((n) => formatTime(minutesOfDay(n.date)))).toEqual(["13:36", "15:12", "23:00"]);
  });

  it("keeps only tonight's bedtime once today's window is over", () => {
    const evening = new Date(2026, 9, 24, 20, 0);
    const plan = planNotifications(schedule(), evening);
    expect(plan[0]).toMatchObject({ dayKey: "2026-10-24", trickIndex: 5 });
    expect(plan[1].dayKey).toBe("2026-10-25");
    expect(plan).toHaveLength(43);
  });

  it("only covers active weekdays", () => {
    // Monday (1) and Wednesday (3) only.
    const plan = planNotifications(schedule("08:00", "16:00", [1, 3]), saturdayMorning);
    expect([...new Set(plan.map((n) => n.date.getDay()))]).toEqual([1, 3]);
    expect(plan).toHaveLength(14);
  });

  it("does not notify tricks already completed", () => {
    const plan = planNotifications(schedule(), saturdayMorning, { completed: new Set(["2026-10-24:0", "2026-10-24:4"]) });
    const today = plan.filter((n) => n.dayKey === "2026-10-24" && n.kind === "trick");
    expect(today.map((n) => n.trickIndex)).toEqual([1, 2, 3, 5]);
  });

  it("gives every notification a unique, stable id", () => {
    const a = planNotifications(schedule(), saturdayMorning);
    const b = planNotifications(schedule(), saturdayMorning);
    expect(new Set(a.map((n) => n.id)).size).toBe(a.length);
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });

  it("never exceeds the pending ceiling, even with a longer horizon", () => {
    const plan = planNotifications(schedule(), saturdayMorning, { horizonDays: 30 });
    expect(plan).toHaveLength(MAX_PENDING_NOTIFICATIONS);
  });

  it("keeps wall-clock times across a DST change (tests run in America/New_York)", () => {
    // DST ends Sunday 1 Nov 2026 in New York.
    const plan = planNotifications(schedule(), new Date(2026, 9, 30, 7, 0));
    const nov1 = plan.filter((n) => n.dayKey === "2026-11-01");
    expect(nov1.map((n) => formatTime(minutesOfDay(n.date)))).toEqual(["08:00", "08:48", "10:24", "12:00", "13:36", "15:12", "23:00"]);
  });
});

describe("snoozeNotification", () => {
  it("fires 10 minutes later with a unique id", () => {
    const now = new Date(2026, 9, 24, 10, 30);
    const snoozed = snoozeNotification("2026-10-24", 2, now);
    expect(snoozed.date.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(snoozed.id).not.toBe("2026-10-24:trick:2");
    expect(snoozed.trickIndex).toBe(2);
  });
});

describe("planTestRun", () => {
  it("compresses the day into a 5-minute window", () => {
    const now = new Date(2026, 9, 24, 10, 0, 0);
    const plan = planTestRun(now, 5, 10);
    const offsets = plan.map((n) => (n.date.getTime() - now.getTime()) / 1000);
    expect(offsets).toEqual([10, 35, 85, 135, 185, 235, 285]);
    expect(plan.every((n) => n.date > now)).toBe(true);
  });
});

describe("isOneOffId", () => {
  it("keeps snoozes and test notifications out of plan rebuilds", () => {
    const now = new Date(2026, 9, 24, 10, 30);
    expect(isOneOffId(snoozeNotification("2026-10-24", 2, now).id)).toBe(true);
    expect(planTestRun(now).every((n) => isOneOffId(n.id))).toBe(true);
    expect(planNotifications(schedule(), saturdayMorning).some((n) => isOneOffId(n.id))).toBe(false);
  });
});

describe("pushRow", () => {
  it("turns a planned reminder into a server queue row that opens the right screen", () => {
    const [opening, tip] = planNotifications(schedule(), saturdayMorning);
    expect(pushRow(tip)).toEqual({ id: "2026-10-24:trick:0", send_at: tip.date.toISOString(), title: tip.title, body: tip.body, url: "/trick/0" });
    expect(pushRow(opening).url).toBe("/");
  });
});

describe("planReminderNotifications", () => {
  const rem = (over: Partial<Reminder> = {}): Reminder => ({
    id: "a", title: "Reunião", notes: "", at: "2026-10-27T17:00", leads: [90], repeat: null,
    doneAt: null, doneThrough: null, updatedAt: 1, deletedAt: null, ...over,
  });
  const noon = new Date(2026, 9, 27, 12, 0);

  it("plans one alert per lead plus the one at the time", () => {
    const plan = planReminderNotifications({ a: rem() }, noon, { slots: 10 });
    expect(plan.map((p) => p.id)).toEqual(["rem:a:2026-10-27T17:00:90", "rem:a:2026-10-27T17:00:0"]);
    expect(plan[0].date).toEqual(new Date(2026, 9, 27, 15, 30));
    expect(plan[0]).toMatchObject({ kind: "reminder", reminderId: "a", occurrence: "2026-10-27T17:00", lead: 90, dayKey: "2026-10-27" });
    expect(plan[1].title).toBe("Agora: Reunião");
  });

  it("skips alerts already past", () => {
    const plan = planReminderNotifications({ a: rem() }, new Date(2026, 9, 27, 16, 0), { slots: 10 });
    expect(plan.map((p) => p.lead)).toEqual([0]);
  });

  it("two leads give three alerts", () => {
    expect(planReminderNotifications({ a: rem({ leads: [90, 60] }) }, noon, { slots: 10 })).toHaveLength(3);
  });

  it("respects slots, until and the 60-day horizon", () => {
    const many = rem({ leads: [60, 30, 20, 10], repeat: { every: 1, unit: "day" } });
    expect(planReminderNotifications({ a: many }, noon, { slots: 0 })).toEqual([]);
    const two = planReminderNotifications({ a: many }, noon, { slots: 2 });
    expect(two.map((p) => p.lead)).toEqual([60, 30]);
    const until = new Date(2026, 9, 27, 16, 0);
    expect(planReminderNotifications({ a: rem() }, noon, { slots: 10, until }).map((p) => p.lead)).toEqual([90]);
    const all = planReminderNotifications({ a: rem({ leads: [], repeat: { every: 1, unit: "day" } }) }, noon, { slots: 500 });
    expect(all.length).toBeLessThanOrEqual(61);
    expect(all.length).toBeGreaterThan(55);
  });

  it("never emits an invalid date", () => {
    expect(planReminderNotifications({ a: rem({ at: "bad" }) }, noon, { slots: 10 })).toEqual([]);
  });
});

describe("reminder snooze and url", () => {
  const rem: Reminder = { id: "a", title: "T", notes: "", at: "2026-10-27T17:00", leads: [90], repeat: null, doneAt: null, doneThrough: null, updatedAt: 1, deletedAt: null };
  const occ = new Date(2026, 9, 27, 17, 0);

  it("snoozes 10 minutes later as a one-off of that occurrence, with text for the new time", () => {
    const now = new Date(2026, 9, 27, 15, 31);
    const snoozed = reminderSnooze(rem, occ, 90, now);
    expect(snoozed.id).toBe(`rem:a:2026-10-27T17:00:snooze:${now.getTime()}`);
    expect(snoozed.date).toEqual(new Date(2026, 9, 27, 15, 41));
    expect(snoozed).toMatchObject({ title: "Daqui a 1 h 19: T", body: "Hoje às 17:00", lead: 90, occurrence: "2026-10-27T17:00", reminderId: "a" });
    expect(isOneOffId(snoozed.id)).toBe(true);
    // Matches the prefixes cancelReminder and cancelReminderOccurrence use.
    expect(snoozed.id.startsWith("rem:a:")).toBe(true);
    expect(snoozed.id.startsWith("rem:a:2026-10-27T17:00:")).toBe(true);
  });

  it("a snooze landing at or after the occurrence reads Agora", () => {
    const late = reminderSnooze(rem, occ, 90, new Date(2026, 9, 27, 16, 55));
    expect(late).toMatchObject({ title: "Agora: T", body: "Às 17:00" });
    expect(reminderSnooze({ ...rem, notes: "Sala 3" }, occ, 0, new Date(2026, 9, 27, 17, 2)).body).toBe("Sala 3");
  });

  it("taps open the reminder with the occurrence and lead", () => {
    const [first] = planReminderNotifications({ a: rem }, new Date(2026, 9, 27, 12, 0), { slots: 5 });
    expect(pushRow(first).url).toBe("/lembretes/a?occ=2026-10-27T17%3A00&lead=90");
    expect(pushRow({ ...first, occurrence: undefined }).url).toBe("/lembretes/a");
  });
});

describe("planAll", () => {
  const daily: Reminder = { id: "a", title: "T", notes: "", at: "2026-10-24T18:00", leads: [], repeat: { every: 1, unit: "day" }, doneAt: null, doneThrough: null, updatedAt: 1, deletedAt: null };

  it("gives reminders only the slots tips leave", () => {
    const plan = planAll(schedule(), { a: daily }, saturdayMorning);
    expect(plan.slice(0, 49).every((n) => n.kind !== "reminder")).toBe(true);
    expect(plan.filter((n) => n.kind === "reminder")).toHaveLength(MAX_PENDING_NOTIFICATIONS - 49);
  });

  it("water on and the cap full leaves no reminder alerts", () => {
    const water = { settings: { enabled: true, goal: 30, everyMinutes: 15 }, start: "08:00", end: "16:00", log: {} };
    const plan = planAll(schedule(), { a: daily }, saturdayMorning, { water });
    expect(plan).toHaveLength(MAX_PENDING_NOTIFICATIONS);
    expect(plan.some((n) => n.kind === "reminder")).toBe(false);
  });

  it("invalid tip hours still plan reminders", () => {
    const plan = planAll(null, { a: daily }, saturdayMorning);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((n) => n.kind === "reminder")).toBe(true);
  });
});
