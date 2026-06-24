"use client";

import { useState } from "react";
import type { DocumentBrief } from "@/types/continuity";
import type { AutoTuneRecommendation as Rec, TuneVector } from "@/lib/writing/autoTune/types";
import { basedOnLine, suggestedHeadline, summaryChips } from "@/lib/writing/autoTune/explain";
import { AutoTuneWhyDrawer } from "./AutoTuneWhyDrawer";

/**
 * The quiet recommendation line above the controls (V10). Shown only when the
 * recommendation has medium/high confidence. It never mutates text on its own.
 */
export function AutoTuneRecommendation({
  rec,
  brief,
  values,
  onReset,
}: {
  rec: Rec;
  brief?: DocumentBrief;
  values: Partial<TuneVector>;
  onReset: () => void;
}) {
  const [why, setWhy] = useState(false);
  if (rec.confidence === "low") return null;
  const chips = summaryChips(values);

  return (
    <div className="relative mb-2.5 border-b border-rule pb-2">
      <p className="text-2xs leading-snug">
        <span className="font-medium text-ink">{suggestedHeadline(brief)}</span>
        <span className="text-ink-faint"> · {chips.join(" · ")}</span>
      </p>
      <div className="mt-1 flex items-center gap-2.5 text-2xs">
        <span className="truncate text-ink-faint">{basedOnLine(rec)}</span>
        <button type="button" onClick={() => setWhy((v) => !v)} className="ml-auto shrink-0 font-medium text-signal hover:underline">
          Why?
        </button>
        <button type="button" onClick={onReset} className="shrink-0 font-medium text-ink-muted hover:text-ink">
          Reset
        </button>
      </div>
      {why && <AutoTuneWhyDrawer rec={rec} onClose={() => setWhy(false)} />}
    </div>
  );
}
