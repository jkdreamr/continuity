import { describe, it, expect } from "vitest";
import { selectPacks, activePacks, decisionFor } from "@/lib/selection";
import { makePack, makeTask } from "./fixtures";

describe("selectPacks — hard mode boundary", () => {
  it("marks Build-only packs unavailable in a Writing task (and they never go active)", () => {
    const buildPack = makePack({ id: "b1", mode: "build", activation: "always_on" });
    const task = makeTask({ mode: "writing" });

    const d = decisionFor(task, [buildPack], "b1");
    expect(d?.state).toBe("unavailable");
    expect(d?.reason).toMatch(/build-only/i);
    expect(activePacks(task, [buildPack])).toHaveLength(0);
  });

  it("keeps a wrong-mode pack out even if the user tried to manually include it", () => {
    const buildPack = makePack({ id: "b1", mode: "build" });
    const task = makeTask({ mode: "writing", includePackIds: ["b1"] });
    expect(decisionFor(task, [buildPack], "b1")?.state).toBe("unavailable");
  });
});

describe("selectPacks — activation", () => {
  it("includes an Always On pack that matches the task mode", () => {
    const pack = makePack({ id: "v1", mode: "writing", activation: "always_on" });
    const task = makeTask({ mode: "writing" });
    const d = decisionFor(task, [pack], "v1");
    expect(d?.state).toBe("active");
    expect(d?.reason).toMatch(/always on/i);
  });

  it("activates a Suggested pack when its tags overlap the task, naming the tag", () => {
    const pack = makePack({ id: "p1", activation: "suggested", tags: ["founder", "outreach"] });
    const task = makeTask({ tags: ["outreach"] });
    const d = decisionFor(task, [pack], "p1");
    expect(d?.state).toBe("active");
    expect(d?.reason.toLowerCase()).toContain("outreach");
  });

  it("leaves a Suggested pack available (not active) when no tags overlap", () => {
    const pack = makePack({ id: "p1", activation: "suggested", tags: ["design"] });
    const task = makeTask({ tags: ["outreach"] });
    expect(decisionFor(task, [pack], "p1")?.state).toBe("available");
  });

  it("leaves a Manual pack available until the user adds it", () => {
    const pack = makePack({ id: "m1", activation: "manual" });
    const task = makeTask({});
    expect(decisionFor(task, [pack], "m1")?.state).toBe("available");

    const withAdd = makeTask({ includePackIds: ["m1"] });
    const d = decisionFor(withAdd, [pack], "m1");
    expect(d?.state).toBe("active");
    expect(d?.reason).toMatch(/added/i);
  });
});

describe("selectPacks — manual exclusion overrides everything", () => {
  it("excludes an Always On pack the user removed for this task", () => {
    const pack = makePack({ id: "v1", mode: "writing", activation: "always_on" });
    const task = makeTask({ mode: "writing", excludePackIds: ["v1"] });
    const d = decisionFor(task, [pack], "v1");
    expect(d?.state).toBe("excluded");
    expect(activePacks(task, [pack])).toHaveLength(0);
  });

  it("excludes a tag-matched Suggested pack the user removed", () => {
    const pack = makePack({ id: "p1", activation: "suggested", tags: ["outreach"] });
    const task = makeTask({ tags: ["outreach"], excludePackIds: ["p1"] });
    expect(decisionFor(task, [pack], "p1")?.state).toBe("excluded");
  });
});

describe("selectPacks — output shape", () => {
  it("returns a decision for every pack and is deterministic", () => {
    const packs = [
      makePack({ id: "a", mode: "writing", activation: "always_on" }),
      makePack({ id: "b", mode: "build" }),
      makePack({ id: "c", activation: "suggested", tags: ["x"] }),
    ];
    const task = makeTask({ mode: "writing", tags: ["x"] });
    const first = selectPacks(task, packs);
    const second = selectPacks(task, packs);
    expect(first).toHaveLength(3);
    expect(first).toEqual(second);
  });
});
