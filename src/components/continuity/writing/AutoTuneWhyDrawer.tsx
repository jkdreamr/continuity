"use client";

import type { AutoTuneRecommendation } from "@/lib/writing/autoTune/types";

/** Lightweight popover listing exactly the signals the recommendation used. */
export function AutoTuneWhyDrawer({ rec, onClose }: { rec: AutoTuneRecommendation; onClose: () => void }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-rule bg-surface p-3 shadow-lift">
      <p className="eyebrow mb-1.5">What this is based on</p>
      <ul className="space-y-1">
        {rec.reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5 text-2xs text-ink-muted">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-signal" />
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-rule pt-2 text-2xs text-ink-faint">
        A starting posture, not a rule. You stay in control.
      </p>
      <button type="button" onClick={onClose} className="mt-2 text-2xs font-medium text-signal hover:underline">
        Close
      </button>
    </div>
  );
}
