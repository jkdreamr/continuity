import type { ContractItemKind } from "@/types/continuity";
import type { PackAccent } from "@/lib/packKinds";

/**
 * User-facing vocabulary for contract items. We never lead the UI with the raw
 * enum; this maps each kind to a plain noun, an accent family (provenance, not
 * decoration), and a one-line hint.
 */
export type ContractKindMeta = {
  noun: string;
  accent: PackAccent;
  hint: string;
};

const META: Record<ContractItemKind, ContractKindMeta> = {
  approved_fact: { noun: "Fact", accent: "ink", hint: "Something you've stated as true." },
  decision: { noun: "Decision", accent: "signal", hint: "A choice already made, don't contradict it." },
  commitment: { noun: "Commitment", accent: "rust", hint: "A promise you'll be held to." },
  constraint: { noun: "Guardrail", accent: "rust", hint: "Something that must stay true." },
  open_question: { noun: "Open question", accent: "ink", hint: "Unknown, must not be fabricated." },
  relationship_note: { noun: "Relationship", accent: "green", hint: "Who this is for, and how you relate." },
  tone_rule: { noun: "Tone", accent: "green", hint: "How this should sound." },
};

export function contractKindMeta(kind: ContractItemKind): ContractKindMeta {
  return META[kind] ?? META.approved_fact;
}

export const SENSITIVITY_LABEL: Record<string, string> = {
  normal: "",
  private: "Private",
  sensitive: "Sensitive",
};

export const APPLY_POLICY_LABEL: Record<string, string> = {
  auto: "Auto-applies",
  review: "Review first",
  manual_only: "Manual only",
  never_auto: "Never auto",
};
