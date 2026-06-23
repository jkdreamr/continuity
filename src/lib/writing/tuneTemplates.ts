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

const TEMPLATES: Record<DocumentKind | "build", TuneTemplate> = {
  manager_email: {
    axes: [
      axis("directness", "Directness", "Gentler", "More direct", "soften the ask with a little lead-in", "lead with the point or ask and cut the hedging"),
      axis("warmth", "Warmth", "Crisp", "Warmer", "keep it crisp and businesslike", "add a warmer, more personal touch"),
      axis("length", "Length", "Shorter", "Fuller", "make it shorter — trim to the essentials", "give it a little more room to breathe"),
    ],
  },
  investor_follow_up: {
    axes: [
      axis("directness", "Directness", "Gentler", "More direct", "soften the ask with a little lead-in", "lead with the point or ask and cut the hedging"),
      axis("warmth", "Warmth", "Crisp", "Warmer", "keep it crisp and businesslike", "add a warmer, more personal touch"),
      axis("length", "Length", "Shorter", "Fuller", "make it shorter — trim to the essentials", "give it a little more room to breathe"),
    ],
  },
  memo: {
    axes: [
      axis("compression", "Compression", "Roomy", "Tight", "let it breathe", "compress — tighten and cut filler"),
      axis("conviction", "Conviction", "Measured", "Assertive", "stay measured and exploratory", "state it with conviction and own the recommendation"),
      axis("polish", "Polish", "Natural", "Refined", "keep it raw and natural", "polish the phrasing and rhythm"),
    ],
  },
  post: {
    axes: [
      axis("energy", "Energy", "Calm", "Charged", "keep it calm and even", "raise the energy and momentum"),
      axis("personalness", "Personalness", "Neutral", "Personal", "keep it neutral", "make it more personal and first-person"),
      axis("polish", "Polish", "Raw", "Refined", "keep it raw and natural", "polish the phrasing"),
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
  build: {
    axes: [
      axis("safety", "Safety", "Bolder", "Safer", "allow a bolder change", "make it safer — smallest reversible change; protect schemas, auth, and routing"),
      axis("structure", "Structure", "Reimagine", "Keep", "reimagine the structure", "keep the existing structure and layout"),
      axis("expression", "Expression", "Restrained", "Expressive", "keep it restrained", "be more expressive within the taste rules"),
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

/** Combine the non-neutral axes into one plain-language instruction. */
export function buildTransformInstruction(t: TuneTemplate, values: Record<string, number>): string {
  const parts = t.axes
    .filter((a) => band(values[a.id] ?? 50) !== "mid")
    .map((a) => a.intent(values[a.id] ?? 50));
  if (!parts.length) return "Rewrite the selection, keeping its meaning, in a slightly cleaner form.";
  return `Rewrite the selection: ${parts.join("; ")}.`;
}
