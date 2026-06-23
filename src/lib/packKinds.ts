import type { PackKind } from "@/types/continuity";

/**
 * Friendly, human-first labels for each pack kind. We never lead the UI with
 * the raw enum or jargon like "system prompt" / "embedding".
 */
export type PackAccent = "ink" | "signal" | "rust" | "green";

export type PackKindMeta = {
  kind: PackKind;
  /** Short noun used in chips and the compiled prompt: "Voice", "Project". */
  noun: string;
  /** Friendly headline used in editors and empty states. */
  label: string;
  /** One-line helper describing what belongs here. */
  blurb: string;
  accent: PackAccent;
  /** lucide-react icon name. */
  icon: string;
};

export const PACK_KIND_META: Record<PackKind, PackKindMeta> = {
  voice: {
    kind: "voice",
    noun: "Voice",
    label: "How I sound",
    blurb: "The way you write — warmth, rhythm, words you do and don't use.",
    accent: "green",
    icon: "AudioLines",
  },
  project: {
    kind: "project",
    noun: "Project",
    label: "What this project is",
    blurb: "Purpose, facts, and current state of the thing you're working on.",
    accent: "signal",
    icon: "Box",
  },
  audience: {
    kind: "audience",
    noun: "Audience",
    label: "Who I am speaking to",
    blurb: "Who reads this, what they know, and what they care about.",
    accent: "signal",
    icon: "Users",
  },
  reference: {
    kind: "reference",
    noun: "Reference",
    label: "Source material to draw on",
    blurb: "Notes, examples, or references this task should lean on.",
    accent: "ink",
    icon: "Quote",
  },
  constraint: {
    kind: "constraint",
    noun: "Constraint",
    label: "What must not change",
    blurb: "Hard boundaries — words to avoid, lines you won't cross.",
    accent: "rust",
    icon: "ShieldAlert",
  },
  decision: {
    kind: "decision",
    noun: "Decision",
    label: "What I have already decided",
    blurb: "Settled choices the AI should carry forward, not re-litigate.",
    accent: "rust",
    icon: "GitCommitHorizontal",
  },
  taste: {
    kind: "taste",
    noun: "Taste",
    label: "Visual direction",
    blurb: "The look and feel — what's in bounds and what's off the table.",
    accent: "green",
    icon: "Palette",
  },
};

export const PACK_KINDS: PackKind[] = [
  "voice",
  "project",
  "audience",
  "reference",
  "constraint",
  "decision",
  "taste",
];

export function kindMeta(kind: PackKind): PackKindMeta {
  return PACK_KIND_META[kind];
}
