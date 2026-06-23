import type { Mode, Reaction } from "@/types/continuity";

export type ReactionDef = { id: Reaction; label: string };

/**
 * Reactions replace pre-output rails. Each is a plain-language chip that maps to
 * a deterministic refinement instruction, appended to the generation request so
 * the change is visible in the compiled prompt.
 */
export const REACTION_INSTRUCTIONS: Record<Reaction, string> = {
  // Writing
  more_like_me:
    "Sound more like me: lean harder on my approved voice and example phrasing, keep my natural rhythm and specific word choices, and strip out generic connective filler.",
  shorter:
    "Make it shorter: cut the length, drop recap and throat-clearing, and keep the core ask plus at most one supporting point.",
  warmer:
    "Make it warmer: add a little genuine acknowledgement and relationship language, without becoming effusive, flattering, or generic.",
  more_direct:
    "Make it more direct: lead with the point or the ask, remove hedges and unnecessary framing, and shorten the run-up.",
  less_polished:
    "Make it less polished: prefer natural sentence variation and a human cadence; avoid corporate balance, symmetry, and over-smoothing.",
  reframe:
    "Reframe it: keep the same goal and facts, but try a noticeably different angle, structure, or opening.",
  // Build
  safer:
    "Make the change safer: prefer the smallest reversible edit, expand the do-not-change list, and do not alter schemas, auth, routing, or unrelated components.",
  bolder:
    "Make the change bolder: allow larger, more opinionated rework where it clearly serves the goal, while still respecting the protected areas.",
  more_editorial:
    "Make it more editorial: stronger hierarchy, more deliberate typography and spacing, less card-heavy and less generic, within the project's taste rules.",
  keep_structure:
    "Keep the existing structure and layout; change surface details and styling only, not the arrangement or flow.",
  plan_first:
    "Plan first: return a short, numbered implementation plan and an audit of what to touch before proposing any concrete change.",
};

export const WRITING_REACTIONS: ReactionDef[] = [
  { id: "more_like_me", label: "More like me" },
  { id: "shorter", label: "Shorter" },
  { id: "warmer", label: "Warmer" },
  { id: "more_direct", label: "More direct" },
  { id: "less_polished", label: "Less polished" },
  { id: "reframe", label: "Reframe it" },
];

export const BUILD_REACTIONS: ReactionDef[] = [
  { id: "safer", label: "Safer" },
  { id: "bolder", label: "Bolder" },
  { id: "more_editorial", label: "More editorial" },
  { id: "keep_structure", label: "Keep structure" },
  { id: "plan_first", label: "Plan first" },
];

export function reactionInstruction(r: Reaction): string {
  return REACTION_INSTRUCTIONS[r];
}

export function reactionsFor(mode: Mode): ReactionDef[] {
  return mode === "build" ? BUILD_REACTIONS : WRITING_REACTIONS;
}
