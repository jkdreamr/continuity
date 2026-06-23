import { describe, it, expect } from "vitest";
import { selectContextMix } from "@/lib/contextMix";
import { makePack } from "./fixtures";

const baseInput = { text: "", mode: "writing" as const };

describe("selectContextMix — baseline eligibility", () => {
  it("auto-applies an approved (Always On), mode-compatible baseline voice", () => {
    const voice = makePack({ id: "v", kind: "voice", mode: "writing", activation: "always_on" });
    const { applied } = selectContextMix({ ...baseInput }, [voice]);
    expect(applied.map((a) => a.contextId)).toContain("v");
    expect(applied.find((a) => a.contextId === "v")?.layer).toBe("voice");
    expect(applied.find((a) => a.contextId === "v")?.confidence).toBe("high");
  });

  it("does NOT auto-apply a mode-incompatible baseline", () => {
    const voice = makePack({ id: "v", kind: "voice", mode: "build", activation: "always_on" });
    const { applied } = selectContextMix({ ...baseInput, mode: "writing" }, [voice]);
    expect(applied.map((a) => a.contextId)).not.toContain("v");
  });

  it("does NOT auto-apply a non-approved (Suggested) baseline with no request match", () => {
    const voice = makePack({ id: "v", kind: "voice", mode: "writing", activation: "suggested", tags: ["x"] });
    const { applied } = selectContextMix({ ...baseInput, text: "hello there" }, [voice]);
    expect(applied.map((a) => a.contextId)).not.toContain("v");
  });
});

describe("selectContextMix — overrides win", () => {
  it("manual exclusion removes an otherwise-auto baseline", () => {
    const g = makePack({ id: "g", kind: "constraint", mode: "both", activation: "always_on" });
    const { applied } = selectContextMix({ ...baseInput, excludeIds: ["g"] }, [g]);
    expect(applied.map((a) => a.contextId)).not.toContain("g");
  });

  it("manual inclusion applies even a manual-only pack", () => {
    const m = makePack({ id: "m", kind: "reference", mode: "writing", activation: "manual" });
    const { applied } = selectContextMix({ ...baseInput, includeIds: ["m"] }, [m]);
    const item = applied.find((a) => a.contextId === "m");
    expect(item?.source).toBe("manual");
    expect(item?.reason.length).toBeGreaterThan(0);
  });
});

describe("selectContextMix — Space selection", () => {
  it("pinned Space outranks a keyword-matched Space (no silent mixing)", () => {
    const pinned = makePack({ id: "p", kind: "project", mode: "both", name: "Acme" });
    const keyword = makePack({ id: "k", kind: "project", mode: "both", name: "Continuity" });
    const { applied } = selectContextMix(
      { ...baseInput, text: "write about Continuity launch", spaceId: "p" },
      [pinned, keyword],
    );
    const spaces = applied.filter((a) => a.layer === "space");
    expect(spaces).toHaveLength(1);
    expect(spaces[0]!.contextId).toBe("p");
    expect(spaces[0]!.reason).toMatch(/pinned/i);
  });

  it("applies a Space when the request mentions it by name", () => {
    const project = makePack({ id: "k", kind: "project", mode: "both", name: "Continuity", activation: "suggested" });
    const { applied } = selectContextMix({ ...baseInput, text: "a post about Continuity" }, [project]);
    expect(applied.map((a) => a.contextId)).toContain("k");
  });
});

describe("selectContextMix — sensitivity + explanations + budget", () => {
  it("never auto-applies a manual-only pack even on a tag match", () => {
    const m = makePack({ id: "m", kind: "project", mode: "writing", activation: "manual", tags: ["founder"], name: "Secret" });
    const { applied } = selectContextMix({ ...baseInput, text: "founder update" }, [m]);
    expect(applied.map((a) => a.contextId)).not.toContain("m");
  });

  it("gives every applied and suggested item a plain-language reason", () => {
    const packs = [
      makePack({ id: "v", kind: "voice", mode: "writing", activation: "always_on" }),
      makePack({ id: "g", kind: "constraint", mode: "both", activation: "always_on" }),
      makePack({ id: "s", kind: "project", mode: "writing", activation: "suggested", tags: ["outreach"] }),
    ];
    const { applied, suggestions } = selectContextMix({ ...baseInput, text: "founder note", tags: ["outreach"] } as never, packs);
    for (const item of [...applied, ...suggestions]) {
      expect(item.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("caps guardrails at five", () => {
    const guardrails = Array.from({ length: 8 }, (_, i) =>
      makePack({ id: `g${i}`, kind: "constraint", mode: "both", activation: "always_on" }),
    );
    const { applied } = selectContextMix({ ...baseInput }, guardrails);
    expect(applied.filter((a) => a.layer === "guardrail").length).toBeLessThanOrEqual(5);
  });
});
