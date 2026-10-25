import {
  isOneOffId,
  MAX_PENDING_NOTIFICATIONS,
  planNotifications,
  planTestRun,
  snoozeNotification,
} from "../notification-plan";
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
    expect(opening.body).toBe("Bom dia! Hoje você tem 6 truques para fazer. O primeiro chega às 08:48.");
  });

  it("uses the short trick text in the title and body", () => {
    const plan = planNotifications(schedule(), saturdayMorning);
    const powerPose = plan.find((n) => n.trickIndex === 1);
    expect(powerPose?.title).toBe("Hora do truque 2: Postura de poder");
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
