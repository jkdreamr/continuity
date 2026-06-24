import { describe, it, expect } from "vitest";
import { migrateWorkspace } from "@/lib/migrate";
import { makePack } from "./fixtures";

function v3Workspace() {
  return {
    version: 3,
    packs: [makePack({ id: "p1", kind: "voice", mode: "writing" })],
    tasks: [],
    artifacts: [],
    requests: [],
    drafts: [],
    documents: [
      {
        id: "doc1",
        title: "Doc",
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        plainText: "hi reid",
        mode: "writing",
        liveHelpEnabled: true,
        activeMemoryOverrides: { includeIds: [], excludeIds: [] },
        version: 1,
        createdAt: "2026-06-23T00:00:00.000Z",
        updatedAt: "2026-06-23T00:00:00.000Z",
      },
    ],
    dismissedProposals: [],
    seededDemo: false,
  };
}

describe("V8 migration (v3 -> v4)", () => {
  it("adds contracts + receipts without losing prior data", () => {
    const m = migrateWorkspace(v3Workspace());
    expect(m).not.toBeNull();
    expect(m!.version).toBe(4);
    expect(m!.contracts).toEqual([]);
    expect(m!.receipts).toEqual([]);
    expect(m!.documents).toHaveLength(1);
    expect(m!.documents[0]!.plainText).toBe("hi reid");
    expect(m!.packs[0]!.id).toBe("p1");
  });

  it("is idempotent", () => {
    const once = migrateWorkspace(v3Workspace())!;
    expect(migrateWorkspace(once)).toEqual(once);
  });

  it("fails safe on garbage (non-destructive)", () => {
    expect(migrateWorkspace({ packs: 5 })).toBeNull();
    expect(() => migrateWorkspace("nope")).not.toThrow();
  });
});
