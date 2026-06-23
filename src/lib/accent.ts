import type { PackAccent } from "@/lib/packKinds";

/**
 * Semantic accent classes. Color is used to mark provenance and state, never as
 * decoration — most surfaces stay neutral. Class strings are literal so
 * Tailwind can see them.
 */
export type AccentClasses = {
  text: string;
  soft: string;
  dot: string;
  border: string;
  stroke: string; // CSS var for SVG (Context Thread)
};

export const ACCENT: Record<PackAccent, AccentClasses> = {
  ink: {
    text: "text-ink",
    soft: "bg-surface-sunk text-ink-muted",
    dot: "bg-ink",
    border: "border-rule",
    stroke: "var(--ink-muted)",
  },
  signal: {
    text: "text-signal-ink",
    soft: "bg-signal-soft text-signal-ink",
    dot: "bg-signal",
    border: "border-signal/30",
    stroke: "var(--signal)",
  },
  rust: {
    text: "text-rust-ink",
    soft: "bg-rust-soft text-rust-ink",
    dot: "bg-rust",
    border: "border-rust/30",
    stroke: "var(--rust)",
  },
  green: {
    text: "text-green-ink",
    soft: "bg-green-soft text-green-ink",
    dot: "bg-green",
    border: "border-green/30",
    stroke: "var(--green)",
  },
};
