"use client";

import { Sparkles } from "lucide-react";
import type { Mode, Reaction } from "@/types/continuity";
import { reactionsFor } from "@/lib/reactions";
import { cx } from "@/lib/cx";

/** Post-output reactions — the main refinement control. No raw sliders. */
export function ReactionRow({
  mode,
  onReact,
  disabled,
  busyReaction,
}: {
  mode: Mode;
  onReact: (reaction: Reaction) => void;
  disabled?: boolean;
  busyReaction?: Reaction | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="eyebrow mr-1 inline-flex items-center gap-1 text-ink-faint">
        <Sparkles size={12} /> React
      </span>
      {reactionsFor(mode).map((r) => (
        <button
          key={r.id}
          type="button"
          disabled={disabled}
          onClick={() => onReact(r.id)}
          className={cx(
            "rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors disabled:opacity-50",
            busyReaction === r.id
              ? "border-signal bg-signal text-white"
              : "border-rule bg-surface text-ink-muted hover:border-ink/25 hover:text-ink",
          )}
        >
          {busyReaction === r.id ? "…" : r.label}
        </button>
      ))}
    </div>
  );
}
