import { ACTION_DONE, ACTION_OK, ACTION_SNOOZE, interpretResponse } from "../notification-actions";

const reminder = { kind: "reminder", dayKey: "2026-10-27", reminderId: "a", occurrence: "2026-10-27T17:00", lead: 90 };
const trick = { kind: "trick", dayKey: "2026-10-27", trickIndex: 2 };

describe("interpretResponse", () => {
  it("maps reminder actions", () => {
    expect(interpretResponse(ACTION_DONE, reminder)).toEqual({ type: "reminder-done", reminderId: "a", occurrence: "2026-10-27T17:00" });
    expect(interpretResponse(ACTION_SNOOZE, reminder)).toEqual({ type: "reminder-snooze", reminderId: "a", occurrence: "2026-10-27T17:00", lead: 90 });
    expect(interpretResponse(ACTION_OK, reminder)).toEqual({ type: "dismiss" });
    expect(interpretResponse("expo.modules.notifications.actions.DEFAULT", reminder)).toEqual({ type: "open-reminder", reminderId: "a", occurrence: "2026-10-27T17:00", lead: 90 });
  });
  it("falls back to open-today for incomplete reminder payloads", () => {
    expect(interpretResponse(ACTION_DONE, { kind: "reminder", dayKey: "d", reminderId: "a" })).toEqual({ type: "open-today" });
  });
  it("keeps trick behavior", () => {
    expect(interpretResponse(ACTION_DONE, trick)).toEqual({ type: "done", trickIndex: 2, dayKey: "2026-10-27" });
    expect(interpretResponse(ACTION_SNOOZE, trick)).toEqual({ type: "snooze", trickIndex: 2, dayKey: "2026-10-27" });
    expect(interpretResponse("default", trick)).toEqual({ type: "open-trick", trickIndex: 2, dayKey: "2026-10-27" });
    expect(interpretResponse("default", { kind: "water", dayKey: "d" })).toEqual({ type: "open-today" });
    expect(interpretResponse("default", null)).toEqual({ type: "open-today" });
  });
});
