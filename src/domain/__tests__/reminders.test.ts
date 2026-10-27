import {
  buildReminder,
  completeReminder,
  isOccurrenceDone,
  deleteReminder,
  doneReminders,
  draftAlerts,
  draftOccurrences,
  isOverdue,
  mergeReminders,
  nextOccurrence,
  occurrenceAt,
  occurrencesBetween,
  parseLocal,
  pendingReminders,
  reopenReminder,
  sanitizeReminders,
  toLocal,
  validateDraft,
  MAX_NOTES,
  MAX_TITLE,
  type Reminder,
  type ReminderDraft,
} from "../reminders";

const NOW = new Date(2026, 9, 27, 12, 0);

function make(over: Partial<Reminder> = {}): Reminder {
  return {
    id: "a",
    title: "Teste",
    notes: "",
    at: "2026-10-28T09:00",
    leads: [],
    repeat: null,
    doneAt: null,
    doneThrough: null,
    updatedAt: 1,
    deletedAt: null,
    ...over,
  };
}

const loc = (d: Date | null) => (d ? toLocal(d) : "null");
const draft: ReminderDraft = { title: "Pagar conta", notes: "", at: "2026-10-28T09:00", leads: [60], repeat: null };

describe("parseLocal / toLocal", () => {
  it("round-trips and rejects invalid text", () => {
    expect(loc(parseLocal("2026-10-28T09:05"))).toBe("2026-10-28T09:05");
    expect(parseLocal("2026-02-30T09:00")).toBeNull();
    expect(parseLocal("abc")).toBeNull();
  });
});

describe("occurrenceAt", () => {
  it("clamps monthly day 31 without drifting", () => {
    const r = { at: "2026-01-31T09:00", repeat: { every: 1, unit: "month" as const } };
    expect(toLocal(occurrenceAt(r, 1))).toBe("2026-02-28T09:00");
    expect(toLocal(occurrenceAt(r, 3))).toBe("2026-04-30T09:00");
    expect(toLocal(occurrenceAt(r, 4))).toBe("2026-05-31T09:00");
  });

  it("clamps yearly 29/02", () => {
    const r = { at: "2028-02-29T08:00", repeat: { every: 1, unit: "year" as const } };
    expect(toLocal(occurrenceAt(r, 1))).toBe("2029-02-28T08:00");
  });

  it("keeps the local hour across the DST change", () => {
    const r = { at: "2026-10-27T17:00", repeat: { every: 1, unit: "week" as const } };
    const d = occurrenceAt(r, 1);
    expect(toLocal(d)).toBe("2026-11-03T17:00");
    expect(d.getHours()).toBe(17);
  });
});

describe("nextOccurrence", () => {
  it("one-off: null when done or deleted, anchor when overdue", () => {
    expect(nextOccurrence(make({ doneAt: 5 }), NOW)).toBeNull();
    expect(nextOccurrence(make({ deletedAt: 5 }), NOW)).toBeNull();
    expect(loc(nextOccurrence(make({ at: "2026-10-01T09:00" }), NOW))).toBe("2026-10-01T09:00");
  });

  it("daily: skips what doneThrough covers", () => {
    const r = make({ at: "2026-10-20T17:00", repeat: { every: 1, unit: "day" }, doneThrough: "2026-10-27T17:00" });
    expect(loc(nextOccurrence(r, new Date(2026, 9, 27, 12, 0)))).toBe("2026-10-28T17:00");
  });

  it("daily at 17:00 with now 17:05 gives tomorrow", () => {
    const r = make({ at: "2026-10-20T17:00", repeat: { every: 1, unit: "day" } });
    expect(loc(nextOccurrence(r, new Date(2026, 9, 27, 17, 5)))).toBe("2026-10-28T17:00");
  });

  it("repeat with future anchor returns the anchor", () => {
    const r = make({ repeat: { every: 1, unit: "day" } });
    expect(loc(nextOccurrence(r, NOW))).toBe("2026-10-28T09:00");
  });

  it("handles an old daily anchor beyond 1000 days", () => {
    const r = make({ at: "2020-01-01T08:00", repeat: { every: 1, unit: "day" } });
    expect(loc(nextOccurrence(r, NOW))).toBe("2026-10-28T08:00");
  });
});

describe("occurrencesBetween / isOverdue", () => {
  it("lists pending repeats in (from, to]", () => {
    const r = make({ at: "2026-10-27T09:00", repeat: { every: 1, unit: "day" }, doneThrough: "2026-10-28T09:00" });
    const list = occurrencesBetween(r, new Date(2026, 9, 27, 0, 0), new Date(2026, 9, 30, 9, 0));
    expect(list.map(toLocal)).toEqual(["2026-10-29T09:00", "2026-10-30T09:00"]);
  });

  it("one-off inside range once, nothing when done", () => {
    const from = new Date(2026, 9, 27);
    const to = new Date(2026, 9, 29);
    expect(occurrencesBetween(make(), from, to)).toHaveLength(1);
    expect(occurrencesBetween(make({ doneAt: 1 }), from, to)).toEqual([]);
  });

  it("overdue only for pending one-off in the past", () => {
    expect(isOverdue(make({ at: "2026-10-01T09:00" }), NOW)).toBe(true);
    expect(isOverdue(make({ at: "2026-10-01T09:00", doneAt: 1 }), NOW)).toBe(false);
    expect(isOverdue(make({ at: "2026-10-01T09:00", repeat: { every: 1, unit: "day" } }), NOW)).toBe(false);
  });
});

describe("validateDraft", () => {
  it("accepts a valid draft", () => expect(validateDraft(draft, NOW)).toBeNull());

  it.each([
    [{ title: "  " }, "Dê um nome ao lembrete."],
    [{ at: "xx" }, "Escolha a data e a hora."],
    [{ at: "2026-10-01T09:00" }, "Escolha uma data e hora no futuro."],
    [{ leads: [0] }, "A antecipação vai de 1 minuto a 7 dias."],
    [{ leads: [10081] }, "A antecipação vai de 1 minuto a 7 dias."],
    [{ leads: [1, 2, 3, 4, 5, 6] }, "Use no máximo 5 antecipações."],
    [{ repeat: { every: 13, unit: "month" as const } }, "A repetição vai de 1 dia a 1 ano."],
    [{ repeat: { every: 0, unit: "day" as const } }, "A repetição vai de 1 dia a 1 ano."],
  ])("rejects %j", (over, msg) => {
    expect(validateDraft({ ...draft, ...over }, NOW)).toBe(msg);
  });
});

describe("buildReminder and state changes", () => {
  it("dedups and sorts leads, trims and caps text", () => {
    const r = buildReminder({ ...draft, title: ` ${"x".repeat(100)} `, leads: [60, 60, 1440] }, "id", NOW);
    expect(r.leads).toEqual([1440, 60]);
    expect(r.title).toHaveLength(80);
    expect(r.updatedAt).toBe(NOW.getTime());
  });

  it("editing at of a done reminder reopens it; other edits keep it", () => {
    const done = make({ doneAt: 9 });
    expect(buildReminder({ ...draft, title: "Outro" }, "a", NOW, done).doneAt).toBe(9);
    expect(buildReminder({ ...draft, at: "2026-11-02T09:00" }, "a", NOW, done).doneAt).toBeNull();
  });

  it("completes one-off and repeating (max)", () => {
    expect(completeReminder(make(), "2026-10-28T09:00", NOW).doneAt).toBe(NOW.getTime());
    const rep = make({ repeat: { every: 1, unit: "day" }, doneThrough: "2026-10-30T09:00" });
    expect(completeReminder(rep, "2026-10-28T09:00", NOW).doneThrough).toBe("2026-10-30T09:00");
    expect(completeReminder(rep, "2026-11-01T09:00", NOW).doneThrough).toBe("2026-11-01T09:00");
  });

  it("tells whether one occurrence is done", () => {
    const rep = make({ repeat: { every: 1, unit: "day" }, doneThrough: "2026-10-30T09:00" });
    expect(isOccurrenceDone(rep, "2026-10-30T09:00")).toBe(true);
    expect(isOccurrenceDone(rep, "2026-10-31T09:00")).toBe(false);
    expect(isOccurrenceDone(make({ repeat: { every: 1, unit: "day" } }), "2026-10-28T09:00")).toBe(false);
    expect(isOccurrenceDone(make(), "2026-10-28T09:00")).toBe(false);
    expect(isOccurrenceDone(make({ doneAt: 3 }), "2026-10-28T09:00")).toBe(true);
  });

  it("reopens and deletes", () => {
    const r = reopenReminder(make({ doneAt: 3, repeat: { every: 1, unit: "day" }, doneThrough: "2026-10-30T09:00" }), NOW);
    expect(r.doneAt).toBeNull();
    expect(r.doneThrough).toBeNull();
    const d = deleteReminder(make(), NOW);
    expect(d.deletedAt).toBe(NOW.getTime());
    expect(d.updatedAt).toBe(NOW.getTime());
  });
});

describe("lists", () => {
  it("pending puts overdue first and drops done/deleted", () => {
    const all = {
      a: make({ id: "a", at: "2026-10-28T09:00" }),
      b: make({ id: "b", at: "2026-10-01T09:00" }),
      c: make({ id: "c", doneAt: 1 }),
      d: make({ id: "d", deletedAt: 1 }),
    };
    const list = pendingReminders(all, NOW);
    expect(list.map((x) => x.reminder.id)).toEqual(["b", "a"]);
    expect(list.map((x) => x.overdue)).toEqual([true, false]);
  });

  it("done sorts by doneAt descending", () => {
    const all = { a: make({ id: "a", doneAt: 1 }), b: make({ id: "b", doneAt: 5 }), c: make({ id: "c" }) };
    expect(doneReminders(all).map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("sanitizeReminders", () => {
  const DAY = 86400000;
  const keyed = (...rs: Reminder[]) => Object.fromEntries(rs.map((r) => [r.id, r]));

  it("keeps valid items and ignores non-records", () => {
    const ok = make({ updatedAt: NOW.getTime() });
    expect(sanitizeReminders(keyed(ok), NOW)).toEqual(keyed(ok));
    expect(sanitizeReminders(null, NOW)).toEqual({});
    expect(sanitizeReminders([ok], NOW)).toEqual({});
  });

  it("drops no title, bad at, key mismatch, bad updatedAt and unknown unit", () => {
    const bad = {
      a: make({ id: "a", title: "  " }),
      b: make({ id: "b", at: "2026-13-01T09:00" }),
      c: make({ id: "zzz" }),
      d: make({ id: "d", updatedAt: 0 }),
      e: make({ id: "e", repeat: { every: 1, unit: "hour" as never } }),
      f: make({ id: "f", updatedAt: 5 }),
    };
    expect(Object.keys(sanitizeReminders(bad, NOW))).toEqual(["f"]);
  });

  it("drops tombstones older than 30 days, keeps newer", () => {
    const old = make({ id: "o", deletedAt: NOW.getTime() - 31 * DAY, updatedAt: NOW.getTime() - 31 * DAY });
    const fresh = make({ id: "n", deletedAt: NOW.getTime() - 29 * DAY, updatedAt: NOW.getTime() - 29 * DAY });
    expect(Object.keys(sanitizeReminders(keyed(old, fresh), NOW))).toEqual(["n"]);
  });

  it("clamps leads, repeat and text", () => {
    const r = make({
      title: ` ${"x".repeat(100)} `,
      notes: "y".repeat(600),
      leads: [5, 5, 0, 99999, 60, 1.5, 10, 20, 30, 40] as number[],
      repeat: { every: 999, unit: "month" },
    });
    const out = sanitizeReminders(keyed(r), NOW).a;
    expect(out.title).toHaveLength(MAX_TITLE);
    expect(out.notes).toHaveLength(MAX_NOTES);
    expect(out.leads).toEqual([60, 40, 30, 20, 10]);
    expect(out.repeat).toEqual({ every: 12, unit: "month" });
  });

  it("nulls an invalid doneThrough", () => {
    expect(sanitizeReminders(keyed(make({ doneThrough: "lixo" })), NOW).a.doneThrough).toBeNull();
  });
});

describe("mergeReminders", () => {
  it("higher updatedAt wins, edit vs tombstone both ways", () => {
    const edit = make({ updatedAt: 10, title: "edit" });
    const tomb = make({ updatedAt: 20, deletedAt: 20 });
    expect(mergeReminders({ a: edit }, { a: tomb }).a).toBe(tomb);
    expect(mergeReminders({ a: tomb }, { a: edit }).a).toBe(tomb);
    const late = make({ updatedAt: 30, title: "late" });
    expect(mergeReminders({ a: tomb }, { a: late }).a).toBe(late);
    expect(mergeReminders({ a: late }, { a: tomb }).a).toBe(late);
  });

  it("tie goes to local; ids from one side enter", () => {
    const l = make({ updatedAt: 5, title: "L" });
    const r = make({ updatedAt: 5, title: "R" });
    expect(mergeReminders({ a: l }, { a: r }).a).toBe(l);
    const b = make({ id: "b" });
    expect(Object.keys(mergeReminders({ a: l }, { b })).sort()).toEqual(["a", "b"]);
  });
});

describe("draft previews", () => {
  const draft = (over: Partial<ReminderDraft> = {}): ReminderDraft => ({
    title: "Estudar",
    notes: "",
    at: "2026-10-27T17:00",
    leads: [],
    repeat: null,
    ...over,
  });

  it("lists leads still ahead, earliest first, then the occurrence", () => {
    expect(draftAlerts(draft({ leads: [30, 90, 30, 600] }), NOW)).toEqual([
      new Date(2026, 9, 27, 15, 30),
      new Date(2026, 9, 27, 16, 30),
      new Date(2026, 9, 27, 17, 0),
    ]);
  });

  it("has no alerts for a past one-off", () => {
    expect(draftAlerts(draft({ at: "2026-10-27T11:00" }), NOW)).toEqual([]);
  });

  it("lists the next occurrences of a repeat", () => {
    expect(draftOccurrences(draft({ repeat: { every: 1, unit: "week" } }), NOW, 3)).toEqual([
      new Date(2026, 9, 27, 17, 0),
      new Date(2026, 10, 3, 17, 0),
      new Date(2026, 10, 10, 17, 0),
    ]);
    expect(draftOccurrences(draft(), NOW, 3)).toEqual([new Date(2026, 9, 27, 17, 0)]);
  });
});
