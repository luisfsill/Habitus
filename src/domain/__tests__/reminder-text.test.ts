import {
  alertBody,
  alertLabel,
  doneLabel,
  joinList,
  shortDate,
  shortDay,
  alertTitle,
  formatLead,
  formatReminderCountdown,
  formatRepeat,
  groupLabel,
  reminderSummary,
  whenLabel,
} from "../reminder-text";
import type { Reminder } from "../reminders";

const now = new Date(2026, 9, 27, 12, 0); // Tue 27 Oct 2026

function reminder(over: Partial<Reminder> = {}): Reminder {
  return { id: "a", title: "Reunião", notes: "", at: "2026-10-27T17:00", leads: [], repeat: null, doneAt: null, doneThrough: null, updatedAt: 1, deletedAt: null, ...over };
}

describe("formatLead", () => {
  it("formats minutes, hours and days", () => {
    expect(formatLead(16)).toBe("16 min");
    expect(formatLead(90)).toBe("1 h 30");
    expect(formatLead(61)).toBe("1 h 01");
    expect(formatLead(60)).toBe("1 h");
    expect(formatLead(1440)).toBe("1 dia");
    expect(formatLead(2880)).toBe("2 dias");
    expect(formatLead(1530)).toBe("1 dia e 1 h 30");
  });
});

describe("formatRepeat", () => {
  it("formats every unit", () => {
    expect(formatRepeat({ every: 1, unit: "day" })).toBe("todo dia");
    expect(formatRepeat({ every: 3, unit: "day" })).toBe("a cada 3 dias");
    expect(formatRepeat({ every: 1, unit: "week" })).toBe("toda semana");
    expect(formatRepeat({ every: 2, unit: "week" })).toBe("a cada 2 semanas");
    expect(formatRepeat({ every: 1, unit: "month" })).toBe("todo mês");
    expect(formatRepeat({ every: 6, unit: "month" })).toBe("a cada 6 meses");
    expect(formatRepeat({ every: 1, unit: "year" })).toBe("todo ano");
  });
});

describe("whenLabel", () => {
  it("says today, tomorrow or the date", () => {
    expect(whenLabel(new Date(2026, 9, 27, 17, 0), now)).toBe("Hoje às 17:00");
    expect(whenLabel(new Date(2026, 9, 28, 9, 30), now)).toBe("Amanhã às 09:30");
    expect(whenLabel(new Date(2026, 10, 3, 17, 0), now)).toBe("Ter, 3 nov às 17:00");
  });
});

describe("groupLabel", () => {
  it("groups by relative day, month and year", () => {
    expect(groupLabel(new Date(2026, 9, 20), now, true)).toBe("Atrasados");
    expect(groupLabel(new Date(2026, 9, 27, 18), now, false)).toBe("Hoje");
    expect(groupLabel(new Date(2026, 9, 28), now, false)).toBe("Amanhã");
    expect(groupLabel(new Date(2026, 10, 3), now, false)).toBe("Novembro");
    expect(groupLabel(new Date(2027, 0, 5), now, false)).toBe("Janeiro de 2027");
  });
});

describe("formatReminderCountdown", () => {
  it("formats days, hours, minutes and now", () => {
    expect(formatReminderCountdown(86_400_000)).toBe("1 dia");
    expect(formatReminderCountdown(3 * 86_400_000 + 5000)).toBe("3 dias");
    expect(formatReminderCountdown(3_661_000)).toBe("1:01:01");
    expect(formatReminderCountdown(125_000)).toBe("02:05");
    expect(formatReminderCountdown(0)).toBe("Agora");
    expect(formatReminderCountdown(-5)).toBe("Agora");
  });
});

describe("reminderSummary", () => {
  it("joins repeat and leads", () => {
    expect(reminderSummary(reminder())).toBe("");
    expect(reminderSummary(reminder({ repeat: { every: 1, unit: "week" }, leads: [90, 15] }))).toBe("↻ toda semana · antecipa 1 h 30, 15 min");
    expect(reminderSummary(reminder({ leads: [1440, 60, 10] }))).toBe("antecipa 1 dia, 1 h, 10 min");
    expect(reminderSummary(reminder({ leads: [1560, 61] }))).toBe("antecipa 1 dia e 2 h, 1 h 01");
  });
});

describe("alertTitle / alertBody", () => {
  const occ = new Date(2026, 9, 27, 17, 0);
  it("lead 0", () => {
    expect(alertTitle("Reunião", occ, occ)).toBe("Agora: Reunião");
    expect(alertBody(reminder(), occ, occ, 0)).toBe("Às 17:00");
    expect(alertBody(reminder({ notes: "Sala 2" }), occ, occ, 0)).toBe("Sala 2");
  });
  it("same-day lead", () => {
    const at = new Date(2026, 9, 27, 15, 30);
    expect(alertTitle("Reunião", occ, at)).toBe("Daqui a 1 h 30: Reunião");
    expect(alertBody(reminder(), occ, at, 90)).toBe("Hoje às 17:00");
  });
  it("lead across days", () => {
    const at = new Date(2026, 9, 26, 17, 0);
    expect(alertTitle("Reunião", occ, at)).toBe("Amanhã às 17:00: Reunião");
  });
});

describe("short labels", () => {
  it("joins lists in Portuguese", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b", "c"])).toBe("a, b e c");
  });

  it("captions a row's day", () => {
    expect(shortDay(new Date(2026, 9, 27, 17, 0), now)).toBe("Hoje");
    expect(shortDay(new Date(2026, 9, 28, 9, 30), now)).toBe("Amanhã");
    expect(shortDay(new Date(2026, 9, 30, 20, 0), now)).toBe("Sex, 30");
  });

  it("names a date, with the year only when it differs", () => {
    expect(shortDate(new Date(2026, 10, 3, 17, 0), now)).toBe("ter 3 nov");
    expect(shortDate(new Date(2027, 1, 2, 17, 0), now)).toBe("ter 2 fev 2027");
  });

  it("labels alerts by relative day, weekday or date", () => {
    expect(alertLabel(new Date(2026, 9, 27, 16, 0), now)).toBe("hoje 16:00");
    expect(alertLabel(new Date(2026, 9, 28, 9, 30), now)).toBe("amanhã 09:30");
    expect(alertLabel(new Date(2026, 10, 2, 16, 0), now)).toBe("seg 16:00");
    expect(alertLabel(new Date(2026, 10, 10, 16, 0), now)).toBe("10 nov 16:00");
  });

  it("formats the completion time", () => {
    expect(doneLabel(new Date(2026, 9, 25, 10, 12).getTime())).toBe("Feito em 25 out, 10:12");
  });
});
