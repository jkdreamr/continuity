import { describe, it, expect } from "vitest";
import { tuneReceipt } from "@/lib/writing/tuneReceipt";
import {
  recordAccept,
  pendingProposal,
  acceptProposal,
  dismissProposal,
  applyPreferenceBias,
  vectorDirections,
  type PrefStore,
} from "@/lib/writing/tunePreferences";
import { makeContractItem } from "@/lib/contracts/extractContractItems";

function fakeStore(): PrefStore {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

describe("tuneReceipt — meaningful only", () => {
  it("returns null when nothing meaningful changed", () => {
    expect(tuneReceipt({ original: "The plan is solid.", final: "The plan is solid." })).toBeNull();
    expect(tuneReceipt({ original: "We shipped the new editor.", final: "We shipped the new editor today." })).toBeNull();
  });

  it("reports a preserved commitment as Kept", () => {
    const items = [makeContractItem("commitment", "Ship the prototype by Friday.", "high")];
    const r = tuneReceipt({
      original: "I just wanted to say we will ship the prototype by Friday for sure.",
      final: "We will ship the prototype by Friday.",
      contractItems: items,
    });
    expect(r).not.toBeNull();
    expect(r!.kept.join(" ")).toMatch(/prototype by Friday/i);
  });

  it("reports an overpromise removal", () => {
    const r = tuneReceipt({
      original: "This is a revolutionary, game-changing, seamless platform.",
      final: "This platform does X and Y.",
    });
    expect(r).not.toBeNull();
    expect(r!.changed.join(" ")).toMatch(/overpromise/i);
  });
});

describe("tunePreferences — repeated accepts only", () => {
  it("does not propose from a single accepted adjustment", () => {
    const s = fakeStore();
    recordAccept(s, ["naturalness:up"]);
    expect(pendingProposal(s)).toBeNull();
  });

  it("proposes after three accepts of the same direction", () => {
    const s = fakeStore();
    recordAccept(s, ["naturalness:up"]);
    recordAccept(s, ["naturalness:up"]);
    recordAccept(s, ["naturalness:up"]);
    const p = pendingProposal(s);
    expect(p?.dir).toBe("naturalness:up");
    expect(p?.label).toMatch(/natural/i);
  });

  it("applies an approved preference as a gentle bias, then stops proposing", () => {
    const s = fakeStore();
    for (let i = 0; i < 3; i++) recordAccept(s, ["naturalness:up"]);
    acceptProposal(s, "naturalness:up");
    expect(pendingProposal(s)).toBeNull();
    expect(applyPreferenceBias(s, { naturalness: 60 }).naturalness!).toBeGreaterThan(60);
  });

  it("respects a dismissal and stops counting it", () => {
    const s = fakeStore();
    for (let i = 0; i < 3; i++) recordAccept(s, ["length:down"]);
    dismissProposal(s, "length:down");
    expect(pendingProposal(s)).toBeNull();
    for (let i = 0; i < 3; i++) recordAccept(s, ["length:down"]);
    expect(pendingProposal(s)).toBeNull(); // dismissed direction is never re-proposed
  });

  it("derives directions from the off-midpoint axes", () => {
    expect(vectorDirections({ formality: 83, length: 50, naturalness: 33 })).toEqual(["formality:up", "naturalness:down"]);
  });
});
