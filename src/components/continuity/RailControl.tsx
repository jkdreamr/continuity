"use client";

import { type RailDef, phraseFor, railBand } from "@/lib/rails";
import { cx } from "@/lib/cx";

export function RailControl({
  rail,
  value,
  onChange,
}: {
  rail: RailDef;
  value: number;
  onChange: (value: number) => void;
}) {
  const band = railBand(value);
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="eyebrow">{rail.label}</span>
        <div className="flex items-center gap-2 text-2xs">
          <span className={cx(band === "low" ? "font-semibold text-ink" : "text-ink-faint")}>
            {rail.lowLabel}
          </span>
          <span className="text-ink-faint">·</span>
          <span className={cx(band === "high" ? "font-semibold text-ink" : "text-ink-faint")}>
            {rail.highLabel}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${rail.label}: ${rail.lowLabel} to ${rail.highLabel}`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-signal"
      />
      <p className="mt-2 text-2xs leading-snug text-ink-muted">
        <span className="text-ink-faint">→ </span>
        {phraseFor(rail, value)}
      </p>
    </div>
  );
}
