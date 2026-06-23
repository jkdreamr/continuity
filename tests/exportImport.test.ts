import { describe, it, expect } from "vitest";
import { exportWorkspace, parseImport, serializeWorkspace } from "@/lib/exportImport";
import type { Workspace } from "@/types/continuity";
import { makePack, makeTask } from "./fixtures";

function sampleWorkspace(): Workspace {
  return {
    version: 2,
    packs: [makePack({ id: "p1", kind: "voice", mode: "writing" })],
    tasks: [makeTask({ id: "t1", mode: "writing" })],
    artifacts: [
      {
        id: "a1",
        taskId: "t1",
        mode: "writing",
        targetTool: "Claude",
        prompt: "PROMPT",
        activePackIds: ["p1"],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    requests: [],
    drafts: [],
    dismissedProposals: [],
    seededDemo: true,
  };
}

describe("export / import round trip", () => {
  it("preserves a valid workspace exactly", () => {
    const ws = sampleWorkspace();
    const result = parseImport(exportWorkspace(ws, "2026-06-22T00:00:00.000Z"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.workspace).toEqual(ws);
  });

  it("accepts a bare workspace object (not wrapped) too", () => {
    const ws = sampleWorkspace();
    const result = parseImport(serializeWorkspace(ws));
    expect(result.ok).toBe(true);
  });

  it("stamps export metadata without mutating the workspace", () => {
    const ws = sampleWorkspace();
    const text = exportWorkspace(ws, "2026-06-22T00:00:00.000Z");
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe("continuity");
    expect(parsed.exportedAt).toBe("2026-06-22T00:00:00.000Z");
    expect(parsed.workspace).toEqual(ws);
  });
});

describe("import rejects bad data gracefully", () => {
  it("returns a friendly error for non-JSON instead of throwing", () => {
    const result = parseImport("this is not json {");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid json/i);
  });

  it("rejects a JSON object that is not a workspace", () => {
    const result = parseImport(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("rejects a workspace with a malformed pack (bad enum)", () => {
    const ws = sampleWorkspace() as unknown as Record<string, unknown>;
    (ws.packs as { kind: string }[])[0]!.kind = "not-a-real-kind";
    const result = parseImport(JSON.stringify({ workspace: ws }));
    expect(result.ok).toBe(false);
  });

  it("never throws on arbitrary input", () => {
    for (const bad of ["", "[]", "null", "42", '{"packs":5}']) {
      expect(() => parseImport(bad)).not.toThrow();
    }
  });
});
