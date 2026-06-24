import type { ContractItem } from "@/types/continuity";
import type { BuildApproach } from "./types";

/**
 * Deterministic Build-approach detection. These are inspectable internal prompt
 * modules that augment the Contracted Build Brief, never a public prompt-pack
 * library. Detection is keyword/heuristic; the writer can always change it.
 */
export type BuildApproachResult = {
  approach: BuildApproach;
  label: string;
  reason: string;
  briefAdditions: string[];
};

const MODULES: Record<BuildApproach, { label: string; additions: string[] }> = {
  "explore-plan": {
    label: "Explore, then plan",
    additions: [
      "First map the relevant files and existing patterns before writing code.",
      "Return a short implementation plan, then implement in small verifiable steps.",
      "State explicit verification: what to run and what proves it works.",
    ],
  },
  "debug-verify": {
    label: "Debug and verify",
    additions: [
      "Reproduce the failure first; state the exact reproduction steps.",
      "Find the root cause before changing code; do not patch the symptom.",
      "Add a regression test that fails before and passes after, and show run evidence.",
    ],
  },
  "minimal-diff": {
    label: "Minimal safe diff",
    additions: [
      "Make the smallest reversible change that satisfies the goal.",
      "Do not touch anything outside the named scope.",
      "Run focused checks on what changed.",
    ],
  },
  "design-refinement": {
    label: "Design refinement",
    additions: [
      "Establish clear visual hierarchy and spacing rhythm.",
      "Handle responsive states (375px to desktop) and interaction states (hover/focus/active/disabled).",
      "Compare before/after with a screenshot; keep accessibility and reduced-motion intact.",
    ],
  },
  "safety-review": {
    label: "Safety review",
    additions: [
      "Name the protected areas (schema, auth, routing) explicitly and do not modify them without approval.",
      "Confirm the change is in scope before any high-risk modification.",
      "Verify no existing behavior, data, or access control is altered.",
    ],
  },
};

function result(approach: BuildApproach, reason: string): BuildApproachResult {
  return { approach, label: MODULES[approach].label, reason, briefAdditions: MODULES[approach].additions };
}

export const ALL_APPROACHES: BuildApproach[] = [
  "explore-plan",
  "debug-verify",
  "minimal-diff",
  "design-refinement",
  "safety-review",
];

/** Build a result for an explicitly chosen approach (the "Change" override). */
export function approachByKey(approach: BuildApproach): BuildApproachResult {
  return result(approach, "You chose this approach.");
}

export function approachLabel(approach: BuildApproach): string {
  return MODULES[approach].label;
}

export function detectBuildApproach(input: { request: string; contractItems?: ContractItem[] }): BuildApproachResult {
  const t = (input.request || "").toLowerCase();

  // Highest risk first.
  if (/\b(schema|migration|database|\bdb\b|auth|authentication|authorization|login|session|routing|router|permission|rbac|payment|billing|stripe|secret|token|env)\b/.test(t))
    return result("safety-review", "Because it touches schemas, auth, or routing.");

  if (/\b(bug|error|fails?|failing|broken|regression|stack ?trace|exception|crash(es|ing)?|not working|doesn'?t work|throws?|undefined|null)\b/.test(t))
    return result("debug-verify", "Because it describes a bug or failing behavior.");

  if (/\b(ui|landing|page|design|visual|layout|css|style|styling|button|modal|component|responsive|screenshot|hero|color|colour|font|spacing|animation|theme)\b/.test(t))
    return result("design-refinement", "Because this request changes a visual product surface.");

  const wordCount = t.trim() ? t.trim().split(/\s+/).length : 0;
  if (
    /\b(refactor|across|multiple files|the codebase|architecture|migrate|integrate|add (a |the )?feature|implement|build (a|an|the|out))\b/.test(t) ||
    wordCount > 18
  )
    return result("explore-plan", "Because this spans an unfamiliar or multi-file area.");

  return result("minimal-diff", "Because this looks like a small, scoped change.");
}
