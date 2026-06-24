import type { DocumentKind } from "@/types/continuity";

/**
 * Selection-Tune templates. Exactly three context-specific axes per document
 * type. Each axis maps a 0–100 value to plain-language intent copy; the same
 * copy that updates live under the slider is what the provider receives.
 */

export type AxisDef = {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  intent: (value: number) => string;
};
export type TuneTemplate = { axes: AxisDef[] };
export type QuickAction = { id: string; label: string; instruction: string };

function band(value: number): "low" | "mid" | "high" {
  if (value <= 33) return "low";
  if (value >= 67) return "high";
  return "mid";
}

function axis(
  id: string,
  label: string,
  lowLabel: string,
  highLabel: string,
  low: string,
  high: string,
): AxisDef {
  return {
    id,
    label,
    lowLabel,
    highLabel,
    intent: (v) => (band(v) === "low" ? low : band(v) === "high" ? high : "keep it balanced"),
  };
}

// Formal email (manager / investor): directness, how firmly you commit, warmth.
const FORMAL_EMAIL: TuneTemplate = {
  axes: [
    axis("directness", "Directness", "Gentler", "More direct", "soften the ask with a little lead-in", "lead with the point or ask and cut the hedging"),
    axis("commitment", "Commitment level", "Tentative", "Firm", "keep any commitment tentative and non-binding", "state the commitment firmly, with a concrete owner and time"),
    axis("warmth", "Warmth", "Crisp", "Warmer", "keep it crisp and businesslike", "add a warmer, more personal touch"),
  ],
};

const TEMPLATES: Record<DocumentKind | "build", TuneTemplate> = {
  manager_email: FORMAL_EMAIL,
  investor_follow_up: FORMAL_EMAIL,
  // Product memo: compression, conviction, and how clearly the decision lands.
  memo: {
    axes: [
      axis("compression", "Compression", "Roomy", "Tight", "let it breathe", "compress — tighten and cut filler"),
      axis("conviction", "Conviction", "Measured", "Assertive", "stay measured and exploratory", "state it with conviction and own the recommendation"),
      axis("decision", "Decision clarity", "Open", "Decisive", "present the options without forcing a decision", "make the recommendation and the decision unmistakable"),
    ],
  },
  // Founder update: confidence, level of detail, and how clear the ask is.
  post: {
    axes: [
      axis("confidence", "Confidence", "Humble", "Confident", "stay humble and understated", "project quiet confidence without hype"),
      axis("detail", "Detail", "High-level", "Detailed", "keep it high-level", "add the concrete detail and numbers that back it up"),
      axis("ask", "Ask clarity", "Soft", "Clear ask", "keep the ask implicit", "make the ask explicit and easy to act on"),
    ],
  },
  reply: {
    axes: [
      axis("faithfulness", "Faithfulness", "Reframe", "Faithful", "feel free to reframe the meaning", "stay faithful to the original meaning and wording"),
      axis("warmth", "Warmth", "Crisp", "Warmer", "keep it crisp", "warmer and more acknowledging"),
      axis("brevity", "Brevity", "Fuller", "Brief", "allow more supporting detail", "make it brief and skimmable"),
    ],
  },
  other: {
    axes: [
      axis("directness", "Directness", "Gentler", "More direct", "soften and add a lead-in", "lead with the point and cut hedging"),
      axis("warmth", "Warmth", "Crisp", "Warmer", "keep it crisp", "add a warmer touch"),
      axis("length", "Length", "Shorter", "Fuller", "trim to the essentials", "give it more room"),
    ],
  },
  // Build brief: safety, whether to keep structure, and how specific to be.
  build: {
    axes: [
      axis("safety", "Safety", "Bolder", "Safer", "allow a bolder change", "make it safer — smallest reversible change; protect schemas, auth, and routing"),
      axis("structure", "Structure", "Reimagine", "Keep", "reimagine the structure", "keep the existing structure and layout"),
      axis("specificity", "Specificity", "Loose", "Specific", "leave room for interpretation", "be concrete and specific about files, components, and acceptance"),
    ],
  },
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "shorter", label: "Shorter", instruction: "Make it shorter: cut the length, drop recap, and keep the core point." },
  { id: "warmer", label: "Warmer", instruction: "Make it warmer: add genuine acknowledgement without becoming effusive or generic." },
  { id: "more_direct", label: "More direct", instruction: "Make it more direct: lead with the point or ask and remove the hedging." },
];

export function tuneTemplate(kind: DocumentKind | "build"): TuneTemplate {
  return TEMPLATES[kind] ?? TEMPLATES.other;
}

export function defaultAxisValues(t: TuneTemplate): Record<string, number> {
  return Object.fromEntries(t.axes.map((a) => [a.id, 50]));
}

/** True when every axis sits at neutral — the live edit should restore the original. */
export function isNeutral(t: TuneTemplate, values: Record<string, number>): boolean {
  return t.axes.every((a) => band(values[a.id] ?? 50) === "mid");
}

/** Combine the non-neutral axes into one plain-language instruction. */
export function buildTransformInstruction(t: TuneTemplate, values: Record<string, number>): string {
  const parts = t.axes
    .filter((a) => band(values[a.id] ?? 50) !== "mid")
    .map((a) => a.intent(values[a.id] ?? 50));
  if (!parts.length) return "Rewrite the selection, keeping its meaning, in a slightly cleaner form.";
  return `Rewrite the selection: ${parts.join("; ")}.`;
}
