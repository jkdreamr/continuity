import { describe, it, expect } from "vitest";
import { buildContractedBrief, BRIEF_SECTION_TITLES } from "@/lib/contracts/buildBrief";
import { compileActive } from "@/lib/compile";
import { makePack, makeTask } from "./fixtures";

function buildTask() {
  return makeTask({
    id: "t-build",
    mode: "build",
    title: "Redesign onboarding",
    goal: "Simplify the first-run onboarding to three steps.",
    notes: "Keep the existing auth flow.",
    targetTool: "Claude Code",
    rails: { boldness: 20, behavior: 20 },
  });
}

describe("buildContractedBrief — the Contracted Build Brief", () => {
  it("produces all ten narrative sections in order", () => {
    const brief = buildContractedBrief(buildTask(), []);
    expect(brief.sections.map((s) => s.title)).toEqual([...BRIEF_SECTION_TITLES]);
  });

  it("leads with the objective from the task goal", () => {
    const brief = buildContractedBrief(buildTask(), []);
    expect(brief.objective).toContain("onboarding");
    expect(brief.sections[0]!.title).toBe("Objective");
    expect(brief.sections[0]!.body).toContain("onboarding");
  });

  it("reuses the deterministic compiler verbatim for the prompt to paste", () => {
    const task = buildTask();
    const active = [makePack({ id: "p1", kind: "project", mode: "build", name: "Product" })];
    const brief = buildContractedBrief(task, active);
    expect(brief.promptToPaste).toBe(compileActive(task, active).prompt);
  });

  it("carries a constraint pack into Protected areas and the receipt", () => {
    const guard = makePack({
      id: "c1",
      kind: "constraint",
      mode: "build",
      name: "Auth is off-limits",
      summary: "Do not change authentication or routing.",
    });
    const brief = buildContractedBrief(buildTask(), [guard]);
    const protectedArea = brief.sections.find((s) => s.title === "Protected areas")!;
    expect(protectedArea.body.toLowerCase()).toContain("authentication");
    // the same truth is preserved in the receipt's context/carry-forward
    expect(brief.receipt.contextUsed.some((i) => i.kind === "constraint")).toBe(true);
  });

  it("includes runnable verification commands and rollback notes", () => {
    const brief = buildContractedBrief(buildTask(), []);
    const verify = brief.sections.find((s) => s.title === "Verification commands")!;
    expect(verify.body).toMatch(/npm (run )?(test|build|lint)/);
    const rollback = brief.sections.find((s) => s.title === "Rollback notes")!;
    expect(rollback.body.length).toBeGreaterThan(0);
  });

  it("always attaches a five-section continuity receipt", () => {
    const brief = buildContractedBrief(buildTask(), []);
    const r = brief.receipt;
    expect(r).toHaveProperty("contextUsed");
    expect(r).toHaveProperty("commitmentsCreated");
    expect(r).toHaveProperty("assumptionsMade");
    expect(r).toHaveProperty("contradictions");
    expect(r).toHaveProperty("carryForwardCandidates");
  });

  it("names an out-of-scope boundary", () => {
    const brief = buildContractedBrief(buildTask(), []);
    const oos = brief.sections.find((s) => s.title === "Out of scope")!;
    expect(oos.body.length).toBeGreaterThan(0);
  });
});
