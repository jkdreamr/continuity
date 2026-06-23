import { describe, it, expect } from "vitest";
import {
  REACTION_INSTRUCTIONS,
  WRITING_REACTIONS,
  BUILD_REACTIONS,
  reactionInstruction,
  reactionsFor,
} from "@/lib/reactions";

describe("reactions", () => {
  it("maps every reaction to a concrete, non-empty instruction", () => {
    for (const r of [...WRITING_REACTIONS, ...BUILD_REACTIONS]) {
      expect(reactionInstruction(r.id).length).toBeGreaterThan(10);
    }
  });

  it("maps specific reactions to the right intent", () => {
    expect(REACTION_INSTRUCTIONS.more_like_me).toMatch(/voice|phrasing|like me/i);
    expect(REACTION_INSTRUCTIONS.shorter).toMatch(/short|length|trim/i);
    expect(REACTION_INSTRUCTIONS.more_direct).toMatch(/direct|lead with|hedge/i);
    expect(REACTION_INSTRUCTIONS.safer).toMatch(/safe|smallest|do not/i);
    expect(REACTION_INSTRUCTIONS.plan_first).toMatch(/plan/i);
  });

  it("exposes the right reaction set per mode", () => {
    expect(reactionsFor("writing")).toBe(WRITING_REACTIONS);
    expect(reactionsFor("build")).toBe(BUILD_REACTIONS);
    expect(WRITING_REACTIONS.map((r) => r.id)).toContain("more_like_me");
    expect(BUILD_REACTIONS.map((r) => r.id)).toContain("safer");
  });
});
