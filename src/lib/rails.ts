import type { Mode } from "@/types/continuity";

/**
 * Intent rails. From the thesis: "no placebo sliders" — every rail maps to a
 * documented compiler behavior and a concrete instruction line. `phrases`
 * are the exact text the compiler emits at each band, so moving a rail
 * visibly changes the compiled prompt.
 */
export type RailBand = "low" | "mid" | "high";

export type RailDef = {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  help: string;
  default: number;
  phrases: { low: string; mid: string; high: string };
};

export function railBand(value: number): RailBand {
  if (value <= 33) return "low";
  if (value >= 67) return "high";
  return "mid";
}

export const WRITING_RAILS: RailDef[] = [
  {
    id: "length",
    label: "Length",
    lowLabel: "Concise",
    highLabel: "Expansive",
    help: "Sets expected length and how much supporting detail to include.",
    default: 35,
    phrases: {
      low: "Keep it concise — short sentences, no preamble; cut anything that doesn't earn its place.",
      mid: "Aim for a balanced length; include supporting detail only where it helps.",
      high: "Give the idea room — develop points with context, examples, and connective reasoning.",
    },
  },
  {
    id: "directness",
    label: "Framing",
    lowLabel: "Direct",
    highLabel: "Nuanced",
    help: "Controls hedging, where conclusions land, and how strong the call-to-action is.",
    default: 30,
    phrases: {
      low: "Lead with the point. State the conclusion plainly and early, with minimal hedging.",
      mid: "Make the point clear, but keep the caveats that honesty requires.",
      high: "Allow nuance — acknowledge tradeoffs and qualify claims where they need it.",
    },
  },
  {
    id: "register",
    label: "Register",
    lowLabel: "Conversational",
    highLabel: "Formal",
    help: "Sets formality, contractions, and sentence rhythm.",
    default: 35,
    phrases: {
      low: "Write conversationally, as if speaking to one person; contractions are welcome.",
      mid: "Use a professional but human register.",
      high: "Use a formal register; avoid contractions and casual asides.",
    },
  },
  {
    id: "stance",
    label: "Stance",
    lowLabel: "Collaborative",
    highLabel: "Assertive",
    help: "Adjusts how strongly the writing owns a recommendation.",
    default: 50,
    phrases: {
      low: "Take a collaborative stance — invite input, prefer 'we', soften directives.",
      mid: "Balance collaboration with a clear recommendation.",
      high: "Take an assertive stance — make one clear recommendation and own it.",
    },
  },
  {
    id: "fidelity",
    label: "Wording",
    lowLabel: "Preserve my phrasing",
    highLabel: "Reframe freely",
    help: "Determines whether my source phrasing is locked, preferred, or a reference.",
    default: 30,
    phrases: {
      low: "Preserve my wording — treat any phrasing I provide as fixed; only fix clear errors.",
      mid: "Prefer my phrasing, but improve flow where it clearly helps.",
      high: "Reframe freely — rewrite for impact while keeping my meaning and intent.",
    },
  },
];

export const BUILD_RAILS: RailDef[] = [
  {
    id: "structure",
    label: "Structure",
    lowLabel: "Preserve structure",
    highLabel: "Reimagine layout",
    help: "How much of the existing layout and structure may change.",
    default: 25,
    phrases: {
      low: "Preserve the existing structure and layout; change surface details only.",
      mid: "Keep the overall structure; refine hierarchy and spacing where it helps.",
      high: "Reimagine the layout where it genuinely serves the goal.",
    },
  },
  {
    id: "expression",
    label: "Expression",
    lowLabel: "Restrained",
    highLabel: "Expressive",
    help: "Visual character, within the project's taste rules.",
    default: 30,
    phrases: {
      low: "Stay restrained — minimal ornament, system defaults, a quiet visual tone.",
      mid: "Balanced expression; deliberate accents, nothing loud.",
      high: "Be expressive — stronger visual character, still inside the project's taste rules.",
    },
  },
  {
    id: "boldness",
    label: "Risk",
    lowLabel: "Safer change",
    highLabel: "Bolder iteration",
    help: "Trades a small, safe change against larger rework.",
    default: 20,
    phrases: {
      low: "Make the smallest change that achieves the goal; prefer reversible edits.",
      mid: "Improve meaningfully while containing risk and blast radius.",
      high: "Iterate boldly; larger rework is acceptable when it is justified.",
    },
  },
  {
    id: "behavior",
    label: "Behavior",
    lowLabel: "Existing behavior protected",
    highLabel: "Intentional behavior change",
    help: "Whether functional behavior may change.",
    default: 15,
    phrases: {
      low: "Do not change existing behavior; make visual and textual changes only.",
      mid: "Change behavior only where the task requires it, and call out each change.",
      high: "Intentional behavior changes are expected; document each one.",
    },
  },
];

export function railsFor(mode: Mode): RailDef[] {
  return mode === "build" ? BUILD_RAILS : WRITING_RAILS;
}

export function getRail(id: string): RailDef | undefined {
  return [...WRITING_RAILS, ...BUILD_RAILS].find((r) => r.id === id);
}

export function defaultRails(mode: Mode): Record<string, number> {
  return Object.fromEntries(railsFor(mode).map((r) => [r.id, r.default]));
}

export function phraseFor(rail: RailDef, value: number): string {
  return rail.phrases[railBand(value)];
}
