import { describe, it, expect } from "vitest";
import { migrateWorkspace } from "@/lib/migrate";
import { makePack, makeTask } from "./fixtures";

function v1Workspace() {
  return {
    version: 1,
    packs: [makePack({ id: "p1", kind: "voice", mode: "writing" })],
    tasks: [makeTask({ id: "t1" })],
    artifacts: [],
    dismissedProposals: [],
    seededDemo: true,
    // note: no `requests`, no `drafts` — this is the V4 shape
  };
}

describe("migrateWorkspace", () => {
  it("upgrades a V4 (v1) workspace to v2 without losing data", () => {
    const migrated = migrateWorkspace(v1Workspace());
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(3);
    expect(migrated!.requests).toEqual([]);
    expect(migrated!.drafts).toEqual([]);
    expect(migrated!.packs).toHaveLength(1);
    expect(migrated!.packs[0]!.id).toBe("p1");
    expect(migrated!.tasks[0]!.id).toBe("t1");
    expect(migrated!.seededDemo).toBe(true);
  });

  it("is idempotent on an already-v2 workspace", () => {
    const once = migrateWorkspace(v1Workspace());
    const twice = migrateWorkspace(once);
    expect(twice).toEqual(once);
  });

  it("returns null for unrecoverable data", () => {
    expect(migrateWorkspace(null)).toBeNull();
    expect(migrateWorkspace("nope")).toBeNull();
    expect(migrateWorkspace({ packs: 5 })).toBeNull();
  });
});
