import { describe, it, expect } from "vitest";
import { newId } from "@/lib/id";

describe("newId", () => {
  it("prefixes ids and keeps them unique across calls", () => {
    const a = newId("pack");
    const b = newId("pack");
    expect(a.startsWith("pack_")).toBe(true);
    expect(a).not.toEqual(b);
  });
});
