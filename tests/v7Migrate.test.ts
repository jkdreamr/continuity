import { describe, it, expect } from "vitest";
import { migrateWorkspace } from "@/lib/migrate";
import { makePack } from "./fixtures";

function v2Workspace() {
  return {
    version: 2,
    packs: [makePack({ id: "p1", kind: "voice", mode: "writing" })],
    tasks: [],
    artifacts: [
      { id: "a1", taskId: "t1", mode: "build", targetTool: "Claude Code", prompt: "BRIEF", activePackIds: [], createdAt: "2026-06-01T00:00:00.000Z" },
    ],
    requests: [
      { id: "rw", text: "Follow up with Reid", inferredMode: "writing", selectedMode: "writing", includeIds: [], excludeIds: [], targetTool: "Claude", createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z" },
      { id: "rb", text: "Redesign onboarding", inferredMode: "build", selectedMode: "build", includeIds: [], excludeIds: [], targetTool: "Claude Code", createdAt: "2026-06-19T00:00:00.000Z", updatedAt: "2026-06-19T00:00:00.000Z" },
    ],
    drafts: [
      { id: "dw", requestId: "rw", mode: "writing", content: "Hi Reid,\n\nGreat to chat.", activeContextIds: [], createdAt: "2026-06-18T00:01:00.000Z" },
      { id: "db", requestId: "rb", mode: "build", content: "PROJECT TASK\nRedesign", provider: "compiler", activeContextIds: [], createdAt: "2026-06-19T00:01:00.000Z" },
    ],
    dismissedProposals: [],
    seededDemo: false,
  };
}

describe("V7 migration (v2 -> v3)", () => {
  it("projects writing drafts into editable documents without losing anything", () => {
    const m = migrateWorkspace(v2Workspace());
    expect(m).not.toBeNull();
    expect(m!.version).toBe(4);
    // one document derived from the writing draft
    expect(m!.documents).toHaveLength(1);
    expect(m!.documents[0]!.mode).toBe("writing");
    expect(m!.documents[0]!.plainText).toContain("Hi Reid");
    expect(m!.documents[0]!.title).toContain("Reid");
  });

  it("preserves Build artifacts/drafts and all prior data (no regression)", () => {
    const m = migrateWorkspace(v2Workspace())!;
    expect(m.drafts).toHaveLength(2); // both writing + build drafts kept
    expect(m.drafts.some((d) => d.mode === "build")).toBe(true);
    expect(m.artifacts).toHaveLength(1);
    expect(m.packs[0]!.id).toBe("p1");
    expect(m.requests).toHaveLength(2);
  });

  it("is idempotent and never duplicates documents", () => {
    const once = migrateWorkspace(v2Workspace())!;
    const twice = migrateWorkspace(once)!;
    expect(twice.documents).toHaveLength(1);
    expect(twice).toEqual(once);
  });

  it("fails safe on garbage (returns null, never throws)", () => {
    expect(migrateWorkspace({ packs: 5 })).toBeNull();
    expect(() => migrateWorkspace("nope")).not.toThrow();
  });
});
