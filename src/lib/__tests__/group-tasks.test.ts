import { describe, it, expect } from "vitest";
import { groupTasks } from "../group-tasks";
import type { GroupableTask } from "../group-tasks";

function makeTask(overrides: Partial<GroupableTask> & { id: string }): GroupableTask {
  return {
    computedStatus: "ready",
    recommendedNext: false,
    priority: "medium",
    position: 0,
    ...overrides,
  };
}

// ─── Bucketing ────────────────────────────────────────────────────────────────

describe("groupTasks — bucketing", () => {
  it("places tasks into the correct bucket by computedStatus", () => {
    const tasks = [
      makeTask({ id: "r", computedStatus: "ready" }),
      makeTask({ id: "b", computedStatus: "blocked" }),
      makeTask({ id: "i", computedStatus: "in_progress" }),
      makeTask({ id: "d", computedStatus: "done" }),
    ];

    const result = groupTasks(tasks);

    expect(result.ready.map((t) => t.id)).toEqual(["r"]);
    expect(result.blocked.map((t) => t.id)).toEqual(["b"]);
    expect(result.in_progress.map((t) => t.id)).toEqual(["i"]);
    expect(result.done.map((t) => t.id)).toEqual(["d"]);
  });

  it("returns empty arrays when no tasks exist", () => {
    const result = groupTasks([]);
    expect(result.ready).toHaveLength(0);
    expect(result.blocked).toHaveLength(0);
    expect(result.in_progress).toHaveLength(0);
    expect(result.done).toHaveLength(0);
  });
});

// ─── Ready bucket sorting ─────────────────────────────────────────────────────

describe("groupTasks — ready bucket ordering", () => {
  it("puts recommendedNext tasks before non-recommended tasks", () => {
    const tasks = [
      makeTask({ id: "normal", recommendedNext: false, priority: "high", position: 0 }),
      makeTask({ id: "rec", recommendedNext: true, priority: "low", position: 1 }),
    ];

    const { ready } = groupTasks(tasks);
    expect(ready[0].id).toBe("rec");
    expect(ready[1].id).toBe("normal");
  });

  it("sorts by priority high→medium→low when recommendedNext is equal", () => {
    const tasks = [
      makeTask({ id: "low", priority: "low", position: 0 }),
      makeTask({ id: "high", priority: "high", position: 1 }),
      makeTask({ id: "med", priority: "medium", position: 2 }),
    ];

    const { ready } = groupTasks(tasks);
    expect(ready.map((t) => t.id)).toEqual(["high", "med", "low"]);
  });

  it("breaks priority ties by position ascending", () => {
    const tasks = [
      makeTask({ id: "pos5", priority: "medium", position: 5 }),
      makeTask({ id: "pos2", priority: "medium", position: 2 }),
      makeTask({ id: "pos8", priority: "medium", position: 8 }),
    ];

    const { ready } = groupTasks(tasks);
    expect(ready.map((t) => t.id)).toEqual(["pos2", "pos5", "pos8"]);
  });

  it("applies all three sort keys together: recommendedNext → priority → position", () => {
    const tasks = [
      makeTask({ id: "a", recommendedNext: false, priority: "high", position: 0 }),
      makeTask({ id: "b", recommendedNext: true, priority: "low", position: 10 }),
      makeTask({ id: "c", recommendedNext: true, priority: "high", position: 5 }),
      makeTask({ id: "d", recommendedNext: false, priority: "low", position: 1 }),
    ];

    const { ready } = groupTasks(tasks);
    // recommended first (c before b because high > low), then non-recommended (a before d)
    expect(ready.map((t) => t.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("does not reorder blocked/in_progress/done buckets", () => {
    const tasks = [
      makeTask({ id: "b2", computedStatus: "blocked", priority: "high", position: 5 }),
      makeTask({ id: "b1", computedStatus: "blocked", priority: "low", position: 0 }),
    ];

    const { blocked } = groupTasks(tasks);
    // insertion order preserved — no sorting applied
    expect(blocked.map((t) => t.id)).toEqual(["b2", "b1"]);
  });
});
