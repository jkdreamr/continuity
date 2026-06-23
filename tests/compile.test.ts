import { describe, it, expect } from "vitest";
import { compile } from "@/lib/compile";
import { makePack, makeTask } from "./fixtures";

describe("compile — writing", () => {
  it("carries a required constraint's content into the prompt", () => {
    const constraint = makePack({
      id: "c1",
      kind: "constraint",
      mode: "writing",
      activation: "always_on",
      priority: "required",
      name: "No generic AI language",
      summary: "Avoid 'revolutionary', 'seamless', 'unlock', 'leverage', and vague claims.",
    });
    const task = makeTask({ mode: "writing" });
    const out = compile(task, [constraint]);
    expect(out.activePackIds).toContain("c1");
    expect(out.prompt).toContain("revolutionary");
    expect(out.prompt.toLowerCase()).toContain("required constraints");
  });

  it("lets a writing rail visibly change the compiled language", () => {
    const task = makeTask({ mode: "writing" });
    const concise = compile({ ...task, rails: { length: 8 } }, []);
    const expansive = compile({ ...task, rails: { length: 92 } }, []);
    expect(concise.prompt).toMatch(/concise/i);
    expect(expansive.prompt).toMatch(/room|develop/i);
    expect(concise.prompt).not.toEqual(expansive.prompt);
  });

  it("includes audience and destination the user provided", () => {
    const task = makeTask({
      mode: "writing",
      audience: "An early design partner",
      destination: "A follow-up email",
    });
    const out = compile(task, []);
    expect(out.prompt).toContain("An early design partner");
    expect(out.prompt).toContain("A follow-up email");
  });

  it("does not emit vague filler", () => {
    const out = compile(makeTask({ mode: "writing" }), []);
    expect(out.prompt).not.toMatch(/make this amazing|best practices|be professional/i);
  });
});

describe("compile — build", () => {
  const buildTask = makeTask({
    mode: "build",
    title: "Redesign onboarding",
    goal: "Redesign the onboarding section to feel calmer and more editorial.",
    targetTool: "Claude Code",
  });

  it("emits explicit non-change constraints when 'Safer change' is at the safe end", () => {
    const out = compile({ ...buildTask, rails: { boldness: 10, behavior: 15 } }, []);
    const lower = out.prompt.toLowerCase();
    expect(lower).toContain("do not change");
    expect(lower).toContain("schema");
    expect(lower).toContain("authentication");
    expect(lower).toContain("routing");
  });

  it("drops the blanket non-change constraints when iterating boldly", () => {
    const safe = compile({ ...buildTask, rails: { boldness: 10 } }, []);
    const bold = compile({ ...buildTask, rails: { boldness: 95 } }, []);
    expect(safe.prompt).not.toEqual(bold.prompt);
    expect(bold.prompt.toLowerCase()).not.toContain("do not alter database schemas");
  });

  it("always includes verification steps", () => {
    const out = compile(buildTask, []);
    const lower = out.prompt.toLowerCase();
    expect(lower).toContain("run the relevant tests");
    expect(lower).toContain("responsive");
    expect(lower).toContain("keyboard focus");
  });

  it("adapts the output to the target build tool", () => {
    const claudeCode = compile({ ...buildTask, targetTool: "Claude Code" }, []);
    const lovable = compile({ ...buildTask, targetTool: "Lovable" }, []);
    expect(claudeCode.prompt).toMatch(/Claude Code/);
    expect(lovable.prompt).toMatch(/Lovable/);
    expect(claudeCode.prompt).not.toEqual(lovable.prompt);
  });
});
