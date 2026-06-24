import { describe, it, expect } from "vitest";
import { generateProposals } from "@/lib/memory";
import type { Workspace } from "@/types/continuity";
import { makePack, makeTask } from "./fixtures";

function ws(partial: Partial<Workspace>): Workspace {
  return {
    version: 2,
    packs: [],
    tasks: [],
    artifacts: [],
    requests: [],
    drafts: [],
    documents: [],
    contracts: [],
    receipts: [],
    dismissedProposals: [],
    seededDemo: false,
    ...partial,
  };
}

describe("generateProposals — promote to Always On", () => {
  it("suggests Always On for a Suggested pack added to 2+ tasks", () => {
    const pack = makePack({ id: "p1", activation: "suggested", name: "Continuity thesis" });
    const w = ws({
      packs: [pack],
      tasks: [
        makeTask({ id: "t1", includePackIds: ["p1"] }),
        makeTask({ id: "t2", includePackIds: ["p1"] }),
      ],
    });
    const proposals = generateProposals(w);
    const promote = proposals.find((p) => p.kind === "promote_always_on");
    expect(promote).toBeTruthy();
    expect(promote?.payload.packId).toBe("p1");
    expect(promote?.actionLabel).toMatch(/always on/i);
  });

  it("does not suggest after only one use", () => {
    const pack = makePack({ id: "p1", activation: "suggested" });
    const w = ws({ packs: [pack], tasks: [makeTask({ includePackIds: ["p1"] })] });
    expect(generateProposals(w).some((p) => p.kind === "promote_always_on")).toBe(false);
  });

  it("never proposes a pack that is already Always On", () => {
    const pack = makePack({ id: "p1", activation: "always_on" });
    const w = ws({
      packs: [pack],
      tasks: [
        makeTask({ id: "t1", includePackIds: ["p1"] }),
        makeTask({ id: "t2", includePackIds: ["p1"] }),
      ],
    });
    expect(generateProposals(w).some((p) => p.payload.packId === "p1")).toBe(false);
  });

  it("honors dismissals", () => {
    const pack = makePack({ id: "p1", activation: "suggested" });
    const w = ws({
      packs: [pack],
      tasks: [
        makeTask({ id: "t1", includePackIds: ["p1"] }),
        makeTask({ id: "t2", includePackIds: ["p1"] }),
      ],
      dismissedProposals: ["promote-always-on:p1"],
    });
    expect(generateProposals(w).some((p) => p.payload.packId === "p1")).toBe(false);
  });
});

describe("generateProposals — confirm build scope", () => {
  it("suggests Build-only when a 'both' pack is removed from a writing task", () => {
    const pack = makePack({ id: "p1", mode: "both", name: "Editorial control room" });
    const w = ws({
      packs: [pack],
      tasks: [makeTask({ id: "t1", mode: "writing", excludePackIds: ["p1"] })],
    });
    const scope = generateProposals(w).find((p) => p.kind === "confirm_build_scope");
    expect(scope?.payload.packId).toBe("p1");
    expect(scope?.payload.mode).toBe("build");
  });
});

describe("generateProposals — save as voice", () => {
  it("suggests saving a repeatedly-required constraint into voice", () => {
    const pack = makePack({
      id: "c1",
      kind: "constraint",
      priority: "required",
      name: "Avoid corporate language",
    });
    const w = ws({
      packs: [pack],
      tasks: [
        makeTask({ id: "t1", includePackIds: ["c1"] }),
        makeTask({ id: "t2", includePackIds: ["c1"] }),
      ],
    });
    const voice = generateProposals(w).find((p) => p.kind === "create_voice_pack");
    expect(voice?.payload.packId).toBe("c1");
  });
});
