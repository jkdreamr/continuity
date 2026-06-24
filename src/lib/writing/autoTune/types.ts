/**
 * AutoTune types (V10). The recommendation engine derives a starting posture for
 * the three writing controls (and the Build approach) from context, deterministic
 * and explainable, never an LLM choosing initial settings.
 */

export type AutoTuneSource = "explicit" | "contract" | "brief" | "selection" | "voice" | "neutral";

export type AutoTuneAxis = "formality" | "length" | "naturalness";

export type BuildApproach =
  | "explore-plan"
  | "debug-verify"
  | "minimal-diff"
  | "design-refinement"
  | "safety-review";

export type AutoTuneConfidence = "high" | "medium" | "low";

export type TuneVector = Record<AutoTuneAxis, number>;

export type AutoTuneRecommendation = {
  surface: "writing" | "build" | "check";
  values: Partial<TuneVector>;
  buildApproach?: BuildApproach;
  confidence: AutoTuneConfidence;
  source: AutoTuneSource;
  reasons: string[];
  userOverride: boolean;
  generatedAt: string;
};

export const AXES: AutoTuneAxis[] = ["formality", "length", "naturalness"];

/** Endpoint labels per axis (low ↔ high). Never "Human" for naturalness. */
export const AXIS_ENDPOINTS: Record<AutoTuneAxis, { low: string; high: string; label: string }> = {
  formality: { label: "Formality", low: "More casual", high: "More formal" },
  length: { label: "Length", low: "Tighter", high: "More complete" },
  naturalness: { label: "Naturalness", low: "More polished", high: "More natural" },
};
