import { describe, it, expect } from "vitest";
import {
  computeTaskStatus,
  computeAllTaskStatuses,
} from "../task-state";

// ─── computeTaskStatus ────────────────────────────────────────────────────────

describe("computeTaskStatus", () => {
  it("returns done for a completed task", () => {
    const task = { id: "1", status: "done", blockedReason: null, dependencies: [] };
    const map = new Map([["1", "done"]]);
    expect(computeTaskStatus(task, map)).toBe("done");
  });

  it("returns done even when blockedReason is set on a done task", () => {
    // once done, always done — blocked check is skipped
    const task = { id: "1", status: "done", blockedReason: "reason", dependencies: [] };
    const map = new Map([["1", "done"]]);
    expect(computeTaskStatus(task, map)).toBe("done");
  });

  it("returns blocked when blockedReason is set (no dependency row)", () => {
    const task = { id: "1", status: "backlog", blockedReason: "waiting for design", dependencies: [] };
    const map = new Map([["1", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });

  it("returns ready when blockedReason is an empty string (spec: null or empty = not blocked)", () => {
    // Empty string must be treated the same as null — the dashboard SQL uses
    // blocked_reason IS NOT NULL AND blocked_reason != '' for the same reason.
    const task = { id: "1", status: "backlog", blockedReason: "", dependencies: [] };
    const map = new Map([["1", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("ready");
  });

  it("returns blocked when a dependency is in_progress (not done)", () => {
    const task = { id: "2", status: "backlog", blockedReason: null, dependencies: ["1"] };
    const map = new Map([["1", "in_progress"], ["2", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });

  it("returns blocked when a dependency is backlog (not done)", () => {
    const task = { id: "2", status: "backlog", blockedReason: null, dependencies: ["1"] };
    const map = new Map([["1", "backlog"], ["2", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });

  it("returns ready when all dependencies are done and no blockedReason", () => {
    const task = { id: "2", status: "backlog", blockedReason: null, dependencies: ["1"] };
    const map = new Map([["1", "done"], ["2", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("ready");
  });

  it("returns ready for a backlog task with no dependencies and no blockedReason", () => {
    const task = { id: "1", status: "backlog", blockedReason: null, dependencies: [] };
    const map = new Map([["1", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("ready");
  });

  it("returns in_progress for an in-progress task with no blockers", () => {
    const task = { id: "1", status: "in_progress", blockedReason: null, dependencies: [] };
    const map = new Map([["1", "in_progress"]]);
    expect(computeTaskStatus(task, map)).toBe("in_progress");
  });

  it("returns blocked for an in-progress task whose dependency is not done", () => {
    const task = { id: "2", status: "in_progress", blockedReason: null, dependencies: ["1"] };
    const map = new Map([["1", "backlog"], ["2", "in_progress"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });

  it("returns blocked for an in-progress task with a blockedReason", () => {
    const task = { id: "1", status: "in_progress", blockedReason: "API key missing", dependencies: [] };
    const map = new Map([["1", "in_progress"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });

  it("returns blocked only when dependency is missing from the map (unknown = not done)", () => {
    // dependency ID present but not in map — treated as not done
    const task = { id: "2", status: "backlog", blockedReason: null, dependencies: ["unknown-id"] };
    const map = new Map([["2", "backlog"]]);
    expect(computeTaskStatus(task, map)).toBe("blocked");
  });
});

// ─── computeAllTaskStatuses ───────────────────────────────────────────────────

describe("computeAllTaskStatuses", () => {
  it("attaches computedStatus to every task", () => {
    const tasks = [
      { id: "1", status: "done", blockedReason: null, dependencies: [] },
      { id: "2", status: "backlog", blockedReason: null, dependencies: ["1"] },
      { id: "3", status: "backlog", blockedReason: "blocked", dependencies: [] },
      { id: "4", status: "in_progress", blockedReason: null, dependencies: [] },
      { id: "5", status: "backlog", blockedReason: null, dependencies: ["3"] },
    ];

    const result = computeAllTaskStatuses(tasks);

    expect(result[0].computedStatus).toBe("done");
    expect(result[1].computedStatus).toBe("ready"); // dep 1 is done
    expect(result[2].computedStatus).toBe("blocked"); // blockedReason
    expect(result[3].computedStatus).toBe("in_progress");
    expect(result[4].computedStatus).toBe("blocked"); // dep 3 is not done
  });

  it("preserves all original task fields", () => {
    const tasks = [
      { id: "1", status: "backlog", blockedReason: null, dependencies: [], extra: "value" },
    ];
    const result = computeAllTaskStatuses(tasks);
    expect(result[0].extra).toBe("value");
    expect(result[0].id).toBe("1");
  });
});
