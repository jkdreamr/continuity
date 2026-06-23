import { describe, it, expect } from "vitest";
import { inferBrief } from "@/lib/writing/documentBrief";

describe("inferBrief — confidence handling", () => {
  it("treats a direct user-stated instruction as high confidence", () => {
    const b = inferBrief("formal email to my boss asking to move Friday's deadline", { userStated: true });
    expect(b.kind).toBe("manager_email");
    expect(b.relationship).toBe("manager");
    expect(b.confidence).toBe("high");
    expect(b.source).toBe("user_stated");
    expect(b.tone).toContain("formal");
  });

  it("returns low confidence for thin / ambiguous text (so it won't auto-apply)", () => {
    const b = inferBrief("hello there", { userStated: false });
    expect(b.kind).toBe("other");
    expect(b.confidence).toBe("low");
    expect(b.source).toBe("inferred_from_document");
  });

  it("infers a founder update at higher confidence from multiple signals", () => {
    const b = inferBrief("Quick founder update for the team on this month's progress.", { userStated: false });
    expect(b.kind).toBe("memo");
    expect(b.confidence).toBe("high");
  });

  it("gives a single weak signal medium confidence (a light ask, not a lock)", () => {
    const b = inferBrief("a quick note to my manager", { userStated: false });
    expect(b.confidence).toBe("medium");
  });

  it("detects an investor follow-up", () => {
    const b = inferBrief("follow up with the investor after our call", { userStated: true });
    expect(b.kind).toBe("investor_follow_up");
    expect(b.relationship).toBe("investor");
  });
});
