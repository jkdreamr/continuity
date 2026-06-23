import { describe, it, expect } from "vitest";
import { inferMode } from "@/lib/inferMode";

describe("inferMode", () => {
  it("defaults to writing", () => {
    expect(inferMode("")).toBe("writing");
    expect(inferMode("Write a thoughtful follow-up to an investor I met yesterday.")).toBe("writing");
    expect(inferMode("Turn these rough notes into a clear founder update.")).toBe("writing");
    expect(inferMode("Make this email warmer, but keep it direct.")).toBe("writing");
  });

  it("infers build for clear software requests", () => {
    expect(inferMode("Redesign the onboarding section without touching authentication.")).toBe("build");
    expect(inferMode("Fix this component")).toBe("build");
    expect(inferMode("change the onboarding flow")).toBe("build");
    expect(inferMode("make a Claude Code prompt")).toBe("build");
    expect(inferMode("update this app")).toBe("build");
    expect(inferMode("refactor the sidebar and keep the data model")).toBe("build");
  });

  it("does not over-trigger on writing verbs that share words with software", () => {
    expect(inferMode("Build a case for why we should raise now.")).toBe("writing");
    expect(inferMode("Add a warmer closing line to this note.")).toBe("writing");
  });
});
