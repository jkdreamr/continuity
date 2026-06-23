import { describe, it, expect } from "vitest";
import { shouldComplete, isCodeLike, looksLikeUrlOrEmail } from "@/lib/writing/completionGate";

const base = { afterCursor: "", collapsed: true, composing: false, hasContext: true };

describe("shouldComplete — gates", () => {
  it("allows a mid-thought collapsed cursor with enough context", () => {
    expect(shouldComplete({ ...base, beforeCursor: "I wanted to follow up on our conversation about" })).toBe(true);
  });

  it("blocks during IME composition", () => {
    expect(shouldComplete({ ...base, beforeCursor: "I wanted to follow up about", composing: true })).toBe(false);
  });

  it("blocks when there is an active (non-collapsed) selection", () => {
    expect(shouldComplete({ ...base, beforeCursor: "I wanted to follow up about", collapsed: false })).toBe(false);
  });

  it("blocks with too little local context", () => {
    expect(shouldComplete({ ...base, beforeCursor: "Hi" })).toBe(false);
  });

  it("blocks after a finished paragraph (blank line)", () => {
    expect(shouldComplete({ ...base, beforeCursor: "That's all for now.\n\n" })).toBe(false);
  });

  it("blocks in code-like / url / email contexts", () => {
    expect(shouldComplete({ ...base, beforeCursor: "reach me at jane.doe@example.com" })).toBe(false);
    expect(shouldComplete({ ...base, beforeCursor: "const handler = () => {" })).toBe(false);
  });
});

describe("guards", () => {
  it("detects code-like text", () => {
    expect(isCodeLike("const x = { a: 1 }")).toBe(true);
    expect(isCodeLike("I am writing a warm note")).toBe(false);
  });
  it("detects urls and emails", () => {
    expect(looksLikeUrlOrEmail("see https://example.com")).toBe(true);
    expect(looksLikeUrlOrEmail("email me at a@b.co")).toBe(true);
    expect(looksLikeUrlOrEmail("just plain prose")).toBe(false);
  });
});
